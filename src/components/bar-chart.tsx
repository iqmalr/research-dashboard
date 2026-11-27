"use client";
import { useState } from "react";

export interface ChartPoint {
  label: string;
  value: number;
  /** tooltip text; defaults to "label: value" */
  tip?: string;
}

interface BarChartProps {
  data: ChartPoint[];
  height?: number;
  showAllLabels?: boolean;
}

export function ChartXAxis({ data, showAllLabels }: { data: ChartPoint[]; showAllLabels?: boolean }) {
  const n = data.length;
  const labelAt = Array.from(new Set([0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1])).filter((i) => i >= 0 && i < n);
  return (
    <div className="flex justify-between pt-2 font-mono text-[11px] text-outline [font-variant-numeric:tabular-nums]">
      {showAllLabels
        ? data.map((d, i) => (
            <span key={i} className="flex-1 text-center truncate">
              {d.label}
            </span>
          ))
        : labelAt.map((i) => <span key={i}>{data[i].label}</span>)}
    </div>
  );
}

export function ChartGrid() {
  return (
    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="border-b border-surface-container w-full" />
      ))}
    </div>
  );
}

export function BarChart({ data, height = 160, showAllLabels = false }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const [picked, setPicked] = useState<number | null>(null);
  const sel = picked !== null && data[picked] ? picked : data.length - 1;
  const cur = data[sel];

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-end gap-1 pt-[18px] flex-1"
        style={{
          minHeight: height,
          background: "repeating-linear-gradient(to top, var(--surface-container) 0 1px, transparent 1px 38px)",
        }}
      >
        {data.map((d, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${d.label}: ${d.value}`}
            title={d.tip ?? `${d.label}: ${d.value.toLocaleString("en-US")}`}
            onClick={() => setPicked(i)}
            onMouseEnter={() => setPicked(i)}
            className={[
              "relative flex-1 min-w-0 min-h-[3px] p-0 border-0 rounded-t-[5px] rounded-b-[2px] cursor-pointer transition-colors",
              i === sel ? "bg-[#2563eb]" : "bg-[#dde8fd] hover:bg-[#8fb0f1]",
            ].join(" ")}
            style={{ height: `${Math.max((d.value / max) * 100, 1)}%` }}
          >
            {data.length <= 24 && (
              <span className={`absolute bottom-full left-1/2 -translate-x-1/2 pb-0.5 text-[10px] tabular-nums ${i === sel ? "font-semibold text-on-surface" : "text-outline"}`}>
                {d.value.toLocaleString("en-US")}
              </span>
            )}
          </button>
        ))}
      </div>

      <ChartXAxis data={data} showAllLabels={showAllLabels} />
      {cur && (
        <div className="mt-3 rounded-xl bg-surface-container-low px-4 py-3 text-[0.8125rem] flex justify-between gap-3">
          <span className="font-semibold text-on-surface">{cur.label}</span>
          <span className="text-on-surface-variant tabular-nums">{cur.tip?.split(": ").slice(1).join(": ") || cur.value.toLocaleString("en-US")}</span>
        </div>
      )}
    </div>
  );
}
