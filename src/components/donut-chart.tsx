export interface DonutSlice {
  label: string;
  value: number;
  tip?: string;
}

const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#6b4fd3", "#f0b64a", "#9aa0a9", "#ec4899", "#0f766e"];
const R = 46;
const CIRC = 2 * Math.PI * R;

interface DonutChartProps {
  slices: DonutSlice[];
  fmt: (v: number) => string;
}

export function DonutChart({ slices, fmt }: DonutChartProps) {
  const total = slices.reduce((s, it) => s + it.value, 0);
  const gap = slices.length > 1 ? 1.5 : 0;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-3 py-1 min-h-0">
      <svg viewBox="0 0 120 120" width={120} height={120} className="shrink-0 [&_circle]:transition-opacity [&:hover_circle.seg:not(:hover)]:opacity-55" role="img" aria-label="Donut chart">
        <g transform="rotate(-90 60 60)">
          <circle cx={60} cy={60} r={R} fill="none" stroke="var(--surface-container)" strokeWidth={16} />
          {slices.map((s, i) => {
            const len = total ? (s.value / total) * CIRC : 0;
            const seg = (
              <circle
                key={i}
                className="seg"
                cx={60}
                cy={60}
                r={R}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={16}
                strokeDasharray={`${Math.max(len - gap, 0.5)} ${CIRC}`}
                strokeDashoffset={-offset}
              >
                <title>{`${s.label}: ${fmt(s.value)} (${total ? ((s.value / total) * 100).toFixed(1) : 0}%)`}</title>
              </circle>
            );
            offset += len;
            return seg;
          })}
        </g>
        <text x={60} y={62} textAnchor="middle" fontSize={20} fill="var(--on-surface)" style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</text>
        <text x={60} y={76} textAnchor="middle" fontSize={9} fill="var(--outline)">total</text>
      </svg>
      <div className="w-full space-y-1.5 overflow-y-auto">
        {slices.map((s, i) => (
          <div key={i} className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-[0.8125rem]">
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="truncate text-on-surface-variant">{s.label}</span>
            <span className="tabular-nums text-right">
              {fmt(s.value)}
              <small className="text-outline ml-1 text-[0.6875rem]">{total ? ((s.value / total) * 100).toFixed(0) : 0}%</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
