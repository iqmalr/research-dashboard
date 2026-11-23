"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";

export type DashboardNav = {
  id: string;
  name: string;
  description: string;
  pages: { id: string; name: string }[];
  status: "ok" | "error";
};

type SidebarProps = {
  dashboards: DashboardNav[];
  totalDashboards: number;
};

function DomainPicker({ dashboards, currentId }: { dashboards: DashboardNav[]; currentId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const current = dashboards.find((d) => d.id === currentId) ?? dashboards[0];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = dashboards.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full h-14 px-3 flex items-center justify-between border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors"
        aria-label="Switch domain"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-primary-container flex items-center justify-center text-on-primary text-xs font-bold shrink-0">
            {current?.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 text-left">
            <div className="text-[0.8125rem] font-semibold text-on-surface leading-tight truncate max-w-[130px]">
              {current?.name ?? "Select domain"}
            </div>
            <div className="text-[0.6875rem] text-outline truncate max-w-[130px]">
              {current?.id ?? "—"}
            </div>
          </div>
        </div>
        <span className="text-[0.6875rem] font-mono text-outline border border-outline-variant/40 rounded px-1.5 py-0.5 shrink-0 select-none">
          Ctrl K
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh]"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-surface-container-lowest border border-outline-variant/40 rounded-[12px] shadow-2xl w-[480px] max-h-[70vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search */}
            <div className="flex items-center px-4 border-b border-outline-variant/20">
              <span className="material-symbols-outlined text-[18px] text-outline mr-2 shrink-0">search</span>
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search domains..."
                className="flex-1 py-3.5 text-[0.9375rem] bg-transparent text-on-surface placeholder:text-outline outline-none"
              />
              <button
                onClick={() => setOpen(false)}
                className="text-[0.75rem] text-outline border border-outline-variant/30 rounded px-1.5 py-0.5 shrink-0"
              >
                Esc
              </button>
            </div>

            <div className="px-4 py-2 border-b border-outline-variant/10">
              <span className="text-[0.6875rem] text-outline">
                Domains · the &ldquo;Overview&rdquo; tab stays open when available
              </span>
            </div>

            {/* Domain list */}
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-[0.875rem] text-outline text-center">No domains found</div>
              )}
              {filtered.map((d) => {
                const isCurrent = d.id === currentId;
                return (
                  <Link
                    key={d.id}
                    href={`/?d=${encodeURIComponent(d.id)}`}
                    onClick={() => setOpen(false)}
                    className={[
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      isCurrent ? "bg-surface-container-low" : "hover:bg-surface-container-low",
                    ].join(" ")}
                  >
                    <div className="w-8 h-8 rounded-[6px] bg-surface-container flex items-center justify-center text-on-surface-variant text-sm font-bold shrink-0">
                      {d.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.875rem] font-medium text-on-surface">{d.name}</div>
                      <div className="text-[0.75rem] text-outline truncate">{d.id}</div>
                    </div>
                    {isCurrent && (
                      <span className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container shrink-0">
                        Current
                      </span>
                    )}
                    {!isCurrent && d.status === "error" && (
                      <span className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-full bg-error-container text-on-error-container shrink-0">
                        Error
                      </span>
                    )}
                    {!isCurrent && d.status === "ok" && (
                      <span className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container shrink-0">
                        OK
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Footer links */}
            <div className="border-t border-outline-variant/20">
              <Link
                href="/manage"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-[0.875rem] text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">home</span>
                Home · all domains
              </Link>
              <Link
                href="/manage"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-[0.875rem] text-primary hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add domain
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const WORKSPACE_NAV = [
  { href: "/manage", label: "Manage", icon: "dashboard" },
  { href: "/sources", label: "Sources", icon: "database" },
  { href: "/sync-history", label: "Sync history", icon: "sync_alt" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function SidebarContent({ dashboards }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentId = searchParams.get("d") ?? dashboards[0]?.id ?? "";
  const currentPageId = searchParams.get("page") ?? "";
  const currentDashboard = dashboards.find((d) => d.id === currentId) ?? dashboards[0];

  const isOnDashboard = pathname === "/";
  const activePage =
    isOnDashboard ? (currentPageId || (currentDashboard?.pages[0]?.id ?? "")) : "";

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface-container-lowest border-r border-outline-variant/30 z-50 flex flex-col select-none">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Domain Picker */}
        {dashboards.length > 0 ? (
          <DomainPicker dashboards={dashboards} currentId={currentId} />
        ) : (
          <div className="h-14 px-3 flex items-center border-b border-outline-variant/20">
            <div className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-outline text-xs font-bold shrink-0 mr-2">
              S
            </div>
            <span className="text-[0.8125rem] text-outline">No domains</span>
          </div>
        )}

        {/* Dashboard section — pages of selected domain */}
        {currentDashboard && (
          <div className="px-2 pb-2">
            <div className="px-1 pt-3 pb-1">
              <span className="text-[0.6875rem] font-semibold text-outline uppercase tracking-wider">Dashboard</span>
            </div>
            <nav className="space-y-0.5">
              {currentDashboard.pages.map(({ id, name }) => {
                const href = `/?d=${encodeURIComponent(currentId)}&page=${encodeURIComponent(id)}`;
                const active = isOnDashboard && activePage === id;
                return (
                  <Link
                    key={id}
                    href={href}
                    className={[
                      "flex items-center px-3 py-1.5 rounded text-[0.8125rem] transition-all",
                      active
                        ? "bg-secondary-container text-on-secondary-container font-semibold"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-normal",
                    ].join(" ")}
                  >
                    {name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Workspace section */}
        <div className="px-2 pb-2">
          <div className="px-1 pt-3 pb-1">
            <span className="text-[0.6875rem] font-semibold text-outline uppercase tracking-wider">Workspace</span>
          </div>
          <nav className="space-y-0.5">
            {WORKSPACE_NAV.map(({ href, label, icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-2 px-3 py-1.5 rounded text-[0.8125rem] transition-all",
                    active
                      ? "bg-secondary-container text-on-secondary-container font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-normal",
                  ].join(" ")}
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-outline-variant/20 p-3 bg-surface-container-lowest shrink-0">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/20" />
          <span className="font-mono text-[0.75rem] text-outline truncate">All daemons active</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant text-[0.75rem] font-semibold shrink-0 border border-outline-variant/30">
              ER
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-[0.8125rem] text-on-surface font-semibold truncate leading-tight">
                Elena Rostova
              </span>
              <span className="text-[0.6875rem] text-outline truncate leading-tight">Lead Engineer</span>
            </div>
          </div>
          <button
            aria-label="Account menu"
            className="text-outline hover:text-on-surface hover:bg-surface-container-high p-0.5 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">more_vert</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense
      fallback={
        <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface-container-lowest border-r border-outline-variant/30 z-50" />
      }
    >
      <SidebarContent {...props} />
    </Suspense>
  );
}
