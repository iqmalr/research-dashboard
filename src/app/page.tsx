import { Suspense } from "react";
import Link from "next/link";
import { loadStore } from "@/lib/store";
import { relTime } from "@/lib/time";
import { DeleteDashboardButton, NewDashboardButton } from "./_components/new-dashboard-button";
import { SyncButton } from "./_components/sync-button";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-6 text-[0.8125rem] text-outline font-mono">Loading dashboards…</div>}>
      <HomeView />
    </Suspense>
  );
}

async function HomeView() {
  const { store, now } = await loadStore();
  const { dashboards, sources, runs } = store;

  const pageCount = dashboards.reduce((n, d) => n + d.pages.length, 0);
  const widgets = dashboards.reduce((n, d) => n + d.pages.reduce((m, p) => m + p.widgets.length, 0), 0);
  const failing = sources.filter((s) => s.status === "error").length;
  const never = sources.filter((s) => s.status === "never").length;
  const lastSync = sources.map((s) => s.lastSyncAt).filter((t): t is string => Boolean(t)).sort().at(-1);
  const recent = runs.slice(0, 40);
  const okRate = recent.length ? Math.round((recent.filter((r) => r.status === "success").length / recent.length) * 100) : null;

  const ticker = [
    { icon: "database", label: "Sources", value: String(sources.length), badge: failing ? `${failing} failing` : never ? `${never} not synced` : "all healthy", badgeOk: failing ? false : never ? null : true },
    { icon: "widgets", label: "Widgets", value: String(widgets), badge: `${pageCount} pages`, badgeOk: null },
    { icon: "cloud_sync", label: "Last sync", value: relTime(lastSync, now), badge: "manual", badgeOk: null },
    { icon: "query_stats", label: "Recent calls OK", value: okRate === null ? "—" : `${okRate}%`, badge: `last ${recent.length}`, badgeOk: okRate === null ? null : okRate === 100 },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <h1 className="text-[1.5rem] leading-8 font-semibold tracking-[-0.02em] text-on-surface">Dashboards</h1>
          <p className="text-[0.8125rem] text-on-surface-variant mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-on-surface font-medium">
              {dashboards.length} dashboard{dashboards.length === 1 ? "" : "s"}
            </span>
            <span className="text-outline-variant">•</span>
            <span>
              {sources.length} connected source{sources.length === 1 ? "" : "s"}
            </span>
            <span className="text-outline-variant">•</span>
            <span className="font-mono text-outline">Widgets read stored snapshots, never the endpoint</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SyncButton
            label="Refresh all"
            icon="refresh"
            className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-[6px] px-2.5 h-8 text-on-surface-variant hover:text-on-surface transition-colors text-xs font-medium"
          />
          <NewDashboardButton />
        </div>
      </div>

      {/* Quick status ticker */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface-container-low border border-outline-variant/30 rounded-[8px] p-4">
        {ticker.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[0.75rem] text-outline uppercase tracking-wider">{s.label}</div>
              <div className="text-[1.125rem] font-semibold tabular-nums text-on-surface">
                {s.value}{" "}
                <span className={["font-mono text-[11px] font-normal", s.badgeOk === true ? "text-secondary" : s.badgeOk === false ? "text-error font-medium" : "text-outline"].join(" ")}>
                  {s.badge}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map((d) => {
          const own = sources.filter((x) => x.dashboardId === d.id);
          const bad = own.filter((x) => x.status === "error").length;
          const good = own.filter((x) => x.status === "ok").length;
          const dot = bad ? "bg-error" : good === 0 ? "bg-warn" : "bg-emerald-500";
          const last = own.map((x) => x.lastSyncAt).filter((t): t is string => Boolean(t)).sort().at(-1);
          const href = `/dashboard?d=${encodeURIComponent(d.id)}`;
          return (
            <div key={d.id} className="relative bg-surface-container-lowest border border-outline-variant/30 rounded-[8px] p-4 flex flex-col gap-3 hover:border-outline-variant/60 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${dot}`} />
                    {/* the link covers the whole card; the delete button sits above it */}
                    <Link href={href} className="font-semibold text-[0.9375rem] text-on-surface after:absolute after:inset-0">
                      {d.name}
                    </Link>
                  </div>
                  <p className="text-[0.8125rem] text-on-surface-variant leading-5">{d.description || "No description"}</p>
                </div>
                {dashboards.length > 1 && (
                  <div className="relative z-10 shrink-0">
                    <DeleteDashboardButton id={d.id} name={d.name} sources={own.length} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-surface-container-high mt-auto">
                <div className="flex items-center gap-1 text-[0.75rem] text-outline">
                  <span className="material-symbols-outlined text-[14px]">database</span>
                  <span>
                    {own.length} source{own.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[0.75rem] text-outline">
                  <span className="material-symbols-outlined text-[14px]">history</span>
                  <span>{relTime(last, now)}</span>
                </div>
                <div className="ml-auto flex gap-1 flex-wrap justify-end">
                  {d.pages.map((p) => (
                    <span key={p.id} className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono text-[10px]">
                      {p.name.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
