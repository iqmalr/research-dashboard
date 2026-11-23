export interface DonutSlice {
  label: string;
  value: number;
  tip?: string;
}

const PALETTE = [
  "#0f766e", "#86f2e4", "#6366f1", "#f59e0b",
  "#ec4899", "#10b981", "#8b5cf6", "#f97316",
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx: number, cy: number, outer: number, inner: number, startAngle: number, endAngle: number): string {
  const delta = Math.min(endAngle - startAngle, 359.99);
  const end = startAngle + delta;
  const large = delta > 180 ? 1 : 0;
  const os = polarToCartesian(cx, cy, outer, startAngle);
  const oe = polarToCartesian(cx, cy, outer, end);
  const is = polarToCartesian(cx, cy, inner, startAngle);
  const ie = polarToCartesian(cx, cy, inner, end);
  return [
    `M ${os.x.toFixed(2)} ${os.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)}`,
    `L ${ie.x.toFixed(2)} ${ie.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${is.x.toFixed(2)} ${is.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

interface DonutChartProps {
  slices: DonutSlice[];
  fmt: (v: number) => string;
}

export function DonutChart({ slices, fmt }: DonutChartProps) {
  const total = slices.reduce((s, it) => s + it.value, 0) || 1;
  let angle = -90;
  const segments = slices.map((s, i) => {
    const sweep = (s.value / total) * 360;
    const start = angle;
    angle += sweep;
    return { ...s, start, sweep, color: PALETTE[i % PALETTE.length] };
  });

  return (
    <div className="h-full flex items-center gap-4 py-1 min-h-0">
      <div className="shrink-0" style={{ width: 110, height: 110 }}>
        <svg viewBox="0 0 100 100" width={110} height={110}>
          {segments.map((seg, i) => (
            <path
              key={i}
              d={segmentPath(50, 50, 42, 24, seg.start, seg.start + seg.sweep)}
              fill={seg.color}
              opacity={0.9}
            >
              <title>{seg.label}: {fmt(seg.value)} ({((seg.value / total) * 100).toFixed(1)}%)</title>
            </path>
          ))}
          <circle cx={50} cy={50} r={23} fill="var(--surface-container-lowest)" />
          <text x={50} y={47} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontFamily="inherit" fill="var(--on-surface-variant)">Total</text>
          <text x={50} y={57} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight="bold" fontFamily="inherit" fill="var(--on-surface)">{fmt(total)}</text>
        </svg>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5 overflow-y-auto max-h-[110px]">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-[0.75rem]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: seg.color }} />
            <span className="truncate text-on-surface-variant flex-1">{seg.label}</span>
            <span className="font-mono font-semibold text-on-surface tabular-nums shrink-0">{fmt(seg.value)}</span>
            <span className="font-mono text-outline tabular-nums shrink-0">{((seg.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
