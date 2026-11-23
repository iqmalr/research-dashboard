"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard",         label: "Overview" },
  { href: "/dashboard/users",   label: "Users",   badge: "1.2k" },
  { href: "/dashboard/revenue", label: "Revenue"  },
  { href: "/dashboard/funnel",  label: "Funnel"   },
  { href: "/dashboard/product", label: "Product"  },
  { href: "/dashboard/content", label: "Content"  },
];

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="bg-surface-container-lowest border-b border-outline-variant/20 px-6 flex items-center justify-between">
      <nav className="flex gap-6" aria-label="Dashboard tabs">
        {TABS.map(({ href, label, badge }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "py-2.5 border-b-2 text-[0.8125rem] flex items-center gap-1.5 transition-colors",
                active
                  ? "border-primary text-on-surface font-semibold"
                  : "border-transparent text-outline hover:text-on-surface font-medium",
              ].join(" ")}
            >
              <span>{label}</span>
              {badge && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="hidden md:flex items-center gap-2 font-mono text-[0.75rem] text-outline">
        <span className="text-outline-variant">Endpoint:</span>
        <span className="text-on-surface-variant font-medium">api.fastfoot.io/v3/telemetry</span>
        <span className="text-outline-variant">•</span>
        <span>Cron: 02:00 UTC</span>
      </div>
    </div>
  );
}
