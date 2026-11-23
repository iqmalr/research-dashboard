"use client";

import { useTransition } from "react";
import { syncAction } from "@/lib/actions";

interface SyncButtonProps {
  /** one source */
  sourceId?: string;
  /** every source of one dashboard. Omit both to sync everything. */
  dashboardId?: string;
  label: string;
  icon?: string;
  className: string;
  iconClassName?: string;
}

/** Calls the endpoints now (all four periods) and refreshes the page with the new snapshots. */
export function SyncButton({ sourceId, dashboardId, label, icon = "sync", className, iconClassName = "text-[16px]" }: SyncButtonProps) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await syncAction(sourceId ? { sourceId } : dashboardId ? { dashboardId } : undefined);
        })
      }
      className={`${className} disabled:opacity-60`}
    >
      <span className={`material-symbols-outlined ${iconClassName} ${pending ? "animate-spin" : ""}`}>{icon}</span>
      {label && <span>{pending ? "Syncing…" : label}</span>}
    </button>
  );
}
