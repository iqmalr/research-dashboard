import { Suspense } from "react";
import Link from "next/link";
import { loadStore } from "@/lib/store";
import { relTime, shortDateTime, STALE_AFTER_MS } from "@/lib/time";
import { parsePeriod } from "@/lib/types";
import { GRID_ROW, gridStyle, snapsForRange, viewProps } from "@/lib/view";
import { WidgetView } from "../_components/widgets/widget-view";
import { DashboardHeader, dashboardHref } from "./_components/dashboard-header";
import { ProblemBanner, type SourceProblem } from "./_components/problem-banner";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="p-6 text-[0.8125rem] text-outline font-mono">Loading dashboard…</div>}>
      <DashboardView searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardView({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const range = parsePeriod(sp.range);
  const { store, now } = await loadStore();
  const dashboard = store.dashboards.find((d) => d.id === sp.d) ?? store.dashboards[0];
  // a dashboard only sees its own sources
  const sources = store.sources.filter((s) => s.dashboardId === dashboard.id);
  const page = dashboard.pages.find((p) => p.id === sp.page) ?? dashboard.pages[0];
  const snaps = snapsForRange(store, range);

  // Only sources this page actually uses can raise a banner here.
  const used = sources.filter((s) => page.widgets.some((w) => w.source_id === s.id));
  const problems: SourceProblem[] = [];
  for (const s of used) {
    const snap = snaps[s.id];
    const dataFrom = snap ? shortDateTime(snap.fetchedAt) : undefined;
    if (s.status === "error") problems.push({ id: s.id, name: s.name, kind: "failing", message: s.lastError?.message ?? "unknown error", dataFrom });
    else if (!snap) problems.push({ id: s.id, name: s.name, kind: "never" });
    else if (now - Date.parse(snap.fetchedAt) > STALE_AFTER_MS) problems.push({ id: s.id, name: s.name, kind: "stale", dataFrom });
  }

  const newest = used
    .map((s) => snaps[s.id]?.fetchedAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);

  return (
    <>
      <DashboardHeader
        dashboardId={dashboard.id}
        name={dashboard.name}
        sources={{ total: sources.length, failing: sources.filter((s) => s.status === "error").length }}
        pages={dashboard.pages.map((p) => ({ id: p.id, name: p.name, count: p.widgets.length }))}
        activePageId={page.id}
        range={range}
        updatedLabel={relTime(newest, now)}
      />

      <div className="p-6 space-y-4 max-w-[1400px]">
        <ProblemBanner problems={problems} />

        {sources.length === 0 && (
          <div className="flex items-center gap-3 p-3 rounded-[6px] bg-amber-50 border border-amber-200 text-[0.8125rem] text-amber-800">
            <span className="material-symbols-outlined text-[18px] text-amber-600">database</span>
            <span className="flex-1">This dashboard has no source yet. Register an endpoint first, then add widgets that read from it.</span>
            <Link href={`/sources?d=${encodeURIComponent(dashboard.id)}&add=1`} className="text-[0.75rem] font-semibold border border-amber-300 rounded px-2 py-0.5 hover:bg-amber-100 transition-colors">
              Add source
            </Link>
          </div>
        )}

        {page.widgets.length === 0 ? (
          <div className="border-2 border-dashed border-outline-variant/40 rounded-[8px] py-16 flex flex-col items-center gap-2 text-outline">
            <span className="material-symbols-outlined text-[28px]">dashboard_customize</span>
            <div className="text-[0.875rem] font-medium text-on-surface-variant">This page has no widgets yet</div>
            <Link href={dashboardHref(dashboard.id, page.id, range, "/dashboard/edit")} className="text-[0.8125rem] text-primary font-semibold hover:underline">
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
