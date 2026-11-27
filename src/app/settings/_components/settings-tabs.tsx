"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/manage", label: "Manage" },
  { href: "/settings/sources", label: "Sources" },
  { href: "/settings/sync-history", label: "Sync history" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="inline-flex gap-0.5 p-1 rounded-[12px] bg-surface-container">
      {TABS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "px-4 py-1.5 rounded-[9px] text-[0.8125rem] transition-colors",
              active
                ? "bg-surface-container-lowest text-on-surface shadow-[var(--shadow)]"
                : "text-on-surface-variant hover:text-on-surface",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
