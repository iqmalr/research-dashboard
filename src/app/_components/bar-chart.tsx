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

  return (
    <div className="h-full flex flex-col">
      {/* Chart area: at least `height`, taller when the card has room */}
      <div className="relative w-full flex-1" style={{ minHeight: height }}>
        <ChartGrid />
        {/* Bars */}
        <div className={`absolute inset-0 z-10 flex items-end pt-4 ${data.length > 45 ? "gap-px" : "gap-[3px]"}`}>
          {data.map((d, i) => (
            <div key={i} className="flex-1 h-full flex flex-col justify-end group cursor-pointer">
              <div
                className="w-full bg-primary-container/85 hover:bg-primary rounded-t-[2px] transition-all"
                style={{ height: `${Math.max((d.value / max) * 100, 1)}%` }}
                title={d.tip ?? `${d.label}: ${d.value.toLocaleString("en-US")}`}
              />
            </div>
          ))}
        </div>
      </div>

      <ChartXAxis data={data} showAllLabels={showAllLabels} />
    </div>
  );
}
