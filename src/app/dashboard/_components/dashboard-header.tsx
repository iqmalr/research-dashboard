import Link from "next/link";
import { SyncButton } from "@/app/_components/sync-button";
import { PERIODS, type Period } from "@/lib/types";

interface DashboardHeaderProps {
  dashboardId: string;
  name: string;
  sources: { total: number; failing: number };
  pages: { id: string; name: string; count: number }[];
  activePageId: string;
  range: Period;
  updatedLabel: string;
}

export const dashboardHref = (dashboardId: string, page: string, range: Period, base = "/dashboard") =>
  `${base}?d=${encodeURIComponent(dashboardId)}&page=${encodeURIComponent(page)}&range=${range}`;

export function SourceBadge({ total, failing, dashboardId }: { total: number; failing: number; dashboardId: string }) {
  const ok = failing === 0;
  const none = total === 0;
  return (
    <Link
      href={`/sources?d=${encodeURIComponent(dashboardId)}`}
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border text-[0.6875rem] ml-1",
        none ? "bg-amber-50 text-amber-800 border-amber-200" : ok ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-error-container/60 text-error border-error/30",
      ].join(" ")}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${none ? "bg-amber-500" : ok ? "bg-emerald-600" : "bg-error"}`} />
      <span className="font-medium">
        {none ? "No sources yet • add one" : `${ok ? "Connected" : `${failing} failing`} • ${total} source${total === 1 ? "" : "s"}`}
      </span>
    </Link>
  );
}

export function PeriodLinks({ range, hrefFor }: { range: Period; hrefFor: (p: Period) => string }) {
  return (
    <div className="inline-flex items-center bg-surface-container-low p-0.5 rounded-[6px] border border-outline-variant/30 text-[0.75rem] font-medium">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          scroll={false}
          className={["px-2.5 py-1 rounded transition-colors", range === p ? "bg-primary-container text-on-primary font-semibold" : "text-outline hover:text-on-surface"].join(" ")}
        >
          {p}
        </Link>
      ))}
    </div>
  );
}

export function DashboardHeader({ dashboardId, name, sources, pages, activePageId, range, updatedLabel }: DashboardHeaderProps) {
  return (
    <>
      {/* Command & action bar */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/30 px-6 py-2 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="p-0.5 text-outline hover:text-on-surface hover:bg-surface-container rounded transition-colors flex items-center justify-center" title="Back to dashboards">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div className="h-4 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-1 text-[0.875rem]">
            <Link href="/" className="text-outline hover:text-on-surface cursor-pointer">
              Dashboards
            </Link>
            <span className="text-outline-variant mx-0.5">/</span>
            <span className="text-[1.125rem] font-semibold text-on-surface tracking-tight">{name}</span>
          </div>
          <SourceBadge {...sources} dashboardId={dashboardId} />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <PeriodLinks range={range} hrefFor={(p) => dashboardHref(dashboardId, activePageId, p)} />

          <div className="hidden lg:flex items-center gap-1 text-outline font-mono text-[0.75rem]">
            <span className="material-symbols-outlined text-[14px]">history</span>
            <span>
              Updated <span className="font-medium text-on-surface-variant">{updatedLabel}</span>
            </span>
          </div>
          <div className="h-4 w-px bg-outline-variant/30 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <SyncButton
              dashboardId={dashboardId}
              label="Refresh"
              icon="refresh"
              iconClassName="text-[15px] text-outline"
              className="h-8 px-3 rounded-[6px] bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 text-on-surface transition-all flex items-center gap-1.5 text-[0.875rem] font-medium"
            />
            <Link
              href={dashboardHref(dashboardId, activePageId, range, "/dashboard/edit")}
              className="h-8 px-3 rounded-[6px] bg-primary-container hover:bg-primary text-on-primary transition-all flex items-center gap-1.5 text-[0.875rem] font-semibold"
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
              <span>Edit</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Page tabs */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/20 px-6 flex items-center justify-between">
        <nav className="flex gap-6 overflow-x-auto" aria-label="Dashboard pages">
          {pages.map((p) => {
            const active = p.id === activePageId;
            return (
              <Link
                key={p.id}
                href={dashboardHref(dashboardId, p.id, range)}
                className={[
                  "py-2.5 border-b-2 text-[0.8125rem] flex items-center gap-1.5 transition-colors whitespace-nowrap",
                  active ? "border-primary text-on-surface font-semibold" : "border-transparent text-outline hover:text-on-surface font-medium",
                ].join(" ")}
              >
                <span>{p.name}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">{p.count}</span>
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-2 font-mono text-[0.75rem] text-outline shrink-0 pl-4">
          <span>Widgets read the last snapshot • period {range}</span>
        </div>
      </div>
    </>
  );
}
