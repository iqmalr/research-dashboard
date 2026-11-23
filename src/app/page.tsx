import { Suspense } from "react";
import Link from "next/link";
import { loadStore } from "@/lib/store";
import { relTime, shortDateTime, STALE_AFTER_MS } from "@/lib/time";
import { parsePeriod, PERIODS, type Period } from "@/lib/types";
import { GRID_ROW, gridStyle, snapsForRange, viewProps } from "@/lib/view";
import { WidgetView } from "@/components/widgets/widget-view";
import { SourceBadge } from "./dashboard/_components/dashboard-header";
import { ProblemBanner, type SourceProblem } from "./dashboard/_components/problem-banner";
import { SyncButton } from "@/components/sync-button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function RootPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="p-6 text-[0.8125rem] text-outline font-mono">Loading…</div>}>
      <RootDashboardView searchParams={searchParams} />
    </Suspense>
  );
}

function pageHref(dashboardId: string, pageId: string, range: Period) {
  return `/?d=${encodeURIComponent(dashboardId)}&page=${encodeURIComponent(pageId)}&range=${range}`;
}

async function RootDashboardView({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const range = parsePeriod(sp.range);
  const { store, now } = await loadStore();

  if (store.dashboards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <span className="material-symbols-outlined text-[48px] text-outline">dashboard</span>
        <div className="text-on-surface-variant text-[0.9375rem]">No dashboards yet</div>
        <Link href="/manage" className="text-primary font-semibold hover:underline text-[0.875rem]">
          Go to Manage to create one
        </Link>
      </div>
    );
  }

  const dashboard = store.dashboards.find((d) => d.id === sp.d) ?? store.dashboards[0];
  const sources = store.sources.filter((s) => s.dashboardId === dashboard.id);
  const page = dashboard.pages.find((p) => p.id === sp.page) ?? dashboard.pages[0];
  const snaps = snapsForRange(store, range);

  const used = sources.filter((s) => page.widgets.some((w) => w.source_id === s.id));
  const problems: SourceProblem[] = [];

  for (const s of used) {
    const snap = snaps[s.id];
    const dataFrom = snap ? shortDateTime(snap.fetchedAt) : undefined;
    if (s.status === "error")
      problems.push({ id: s.id, name: s.name, kind: "failing", message: s.lastError?.message ?? "unknown error", dataFrom });
    else if (!snap)
      problems.push({ id: s.id, name: s.name, kind: "never" });
    else if (now - Date.parse(snap.fetchedAt) > STALE_AFTER_MS)
      problems.push({ id: s.id, name: s.name, kind: "stale", dataFrom });
  }

  const newest = used
    .map((s) => snaps[s.id]?.fetchedAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);

  const failing = sources.filter((s) => s.status === "error").length;

  return (
    <>
      {/* Page action bar */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/30 px-6 py-2 flex flex-wrap items-center justify-between gap-3 select-none sticky top-14 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[1rem] font-semibold text-on-surface tracking-tight">{page.name}</span>
          <SourceBadge total={sources.length} failing={failing} dashboardId={dashboard.id} />
          {newest && (
            <span className="hidden lg:flex items-center gap-1 text-outline font-mono text-[0.75rem]">
              <span className="material-symbols-outlined text-[14px]">history</span>
              <span>
                Updated <span className="font-medium text-on-surface-variant">{relTime(newest, now)}</span>
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Period selector */}
          <div className="inline-flex items-center bg-surface-container-low p-0.5 rounded-[6px] border border-outline-variant/30 text-[0.75rem] font-medium">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={pageHref(dashboard.id, page.id, p)}
                scroll={false}
                className={[
                  "px-2.5 py-1 rounded transition-colors",
                  range === p
                    ? "bg-primary-container text-on-primary font-semibold"
                    : "text-outline hover:text-on-surface",
                ].join(" ")}
              >
                {p}
              </Link>
            ))}
          </div>

          <SyncButton
            dashboardId={dashboard.id}
            label="Refresh"
            icon="refresh"
            iconClassName="text-[15px] text-outline"
            className="h-8 px-3 rounded-[6px] bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 text-on-surface transition-all flex items-center gap-1.5 text-[0.875rem] font-medium"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4 max-w-[1400px]">
        <ProblemBanner problems={problems} />

        {sources.length === 0 && (
          <div className="flex items-center gap-3 p-3 rounded-[6px] bg-amber-50 border border-amber-200 text-[0.8125rem] text-amber-800">
            <span className="material-symbols-outlined text-[18px] text-amber-600">database</span>
            <span className="flex-1">
              This dashboard has no source yet. Register an endpoint first, then add widgets.
            </span>
            <Link
              href={`/sources?d=${encodeURIComponent(dashboard.id)}&add=1`}
              className="text-[0.75rem] font-semibold border border-amber-300 rounded px-2 py-0.5 hover:bg-amber-100 transition-colors"
            >
              Add source
            </Link>
          </div>
        )}

        {page.widgets.length === 0 ? (
          <div className="border-2 border-dashed border-outline-variant/40 rounded-[8px] py-16 flex flex-col items-center gap-2 text-outline">
            <span className="material-symbols-outlined text-[28px]">dashboard_customize</span>
            <div className="text-[0.875rem] font-medium text-on-surface-variant">This page has no widgets yet</div>
            <Link
              href={`/dashboard/edit?d=${encodeURIComponent(dashboard.id)}&page=${encodeURIComponent(page.id)}&range=${range}`}
              className="text-[0.8125rem] text-primary font-semibold hover:underline"
            >
              Add the first widget
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4" style={{ gridAutoRows: GRID_ROW }}>
            {page.widgets.map((w) => (
              <div key={w.id} className="min-w-0 [&>*]:h-full" style={gridStyle(w.grid)}>
                <WidgetView widget={w} {...viewProps(w, sources, snaps)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
