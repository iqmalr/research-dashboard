"use client";

import { useState } from "react";

const PERIODS = ["7d", "30d", "90d", "12m"] as const;
type Period = (typeof PERIODS)[number];

export function PeriodSelector() {
  const [period, setPeriod] = useState<Period>("30d");
  return (
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
  );
}
