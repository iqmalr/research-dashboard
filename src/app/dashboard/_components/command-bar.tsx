"use client";

import Link from "next/link";
import { useState } from "react";
import { DashboardTabs } from "./tabs";

const PERIODS = ["7d", "30d", "90d", "12m"] as const;
type Period = (typeof PERIODS)[number];

export function CommandBar() {
  const [period, setPeriod] = useState<Period>("30d");

  return (
    <>
      {/* Command & action bar */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/30 px-6 py-2 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="p-0.5 text-outline hover:text-on-surface hover:bg-surface-container rounded transition-colors flex items-center justify-center"
            title="Back to dashboards"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div className="h-4 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-1 text-[0.875rem]">
            <Link href="/" className="text-outline hover:text-on-surface cursor-pointer">
              Dashboards
            </Link>
            <span className="text-outline-variant mx-0.5">/</span>
            <span className="text-[1.125rem] font-semibold text-on-surface tracking-tight">
              Football Analytics AI
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-[0.6875rem] ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span className="font-medium">Connected • 2 sources</span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Period selector */}
          <div className="inline-flex items-center bg-surface-container-low p-0.5 rounded-[6px] border border-outline-variant/30 text-[0.75rem] font-medium">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={[
                  "px-2.5 py-1 rounded transition-colors",
                  period === p
                    ? "bg-primary-container text-on-primary font-semibold"
                    : "text-outline hover:text-on-surface",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Updated timestamp */}
          <div className="hidden lg:flex items-center gap-1 text-outline font-mono text-[0.75rem]">
            <span className="material-symbols-outlined text-[14px]">history</span>
            <span>
              Updated today <span className="font-medium text-on-surface-variant">02:00 CET</span>
            </span>
          </div>
          <div className="h-4 w-px bg-outline-variant/30 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <button className="btn">
              <span className="material-symbols-outlined text-[15px] text-outline">refresh</span>
              <span>Refresh</span>
            </button>
            <Link href="/dashboard/edit" className="btn btn-primary">
              <span className="material-symbols-outlined text-[15px]">edit</span>
              <span>Edit</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <DashboardTabs />
    </>
  );
}
