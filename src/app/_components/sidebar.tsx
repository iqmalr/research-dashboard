"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/",             label: "Home",         icon: "dashboard"  },
  { href: "/sources",      label: "Sources",      icon: "database"   },
  { href: "/sync-history", label: "Sync history", icon: "sync_alt"   },
  { href: "/settings",     label: "Settings",     icon: "settings"   },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface-container-lowest border-r border-outline-variant/30 z-50 flex flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Logo */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary-container flex items-center justify-center text-on-primary text-xs font-bold">
              S
            </div>
            <span className="font-semibold text-[1.125rem] leading-6 text-on-surface tracking-tight">
              Stats
            </span>
            <span className="px-1 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[0.6875rem] font-medium tracking-wide uppercase">
              Studio Ops
            </span>
          </div>
          <button
            aria-label="Collapse sidebar"
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high p-0.5 rounded flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">dock_to_left</span>
          </button>
        </div>

        {/* Nav */}
        <div className="p-2">
          <div className="px-1 py-0.5 mb-1">
            <span className="text-[0.6875rem] font-semibold text-outline uppercase tracking-wider">
              Workspace
            </span>
          </div>
          <nav className="space-y-0.5">
            {nav.map(({ href, label, icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);
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
      <div className="flex flex-col border-t border-outline-variant/20 p-3 bg-surface-container-lowest">
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
              <span className="text-[0.6875rem] text-outline truncate leading-tight">
                Lead Engineer
              </span>
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
