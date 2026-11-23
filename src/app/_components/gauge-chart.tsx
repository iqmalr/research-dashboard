function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const delta = Math.min(endAngle - startAngle, 359.99);
  const end = startAngle + delta;
  const large = delta > 180 ? 1 : 0;
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, end);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

interface GaugeChartProps {
  value: number | null;
  target: number | null;
  valueLabel: string;
  targetLabel?: string;
}

export function GaugeChart({ value, target, valueLabel, targetLabel }: GaugeChartProps) {
  const START = 135;
  const RANGE = 270;
  const max = target ?? (typeof value === "number" ? value * 1.25 || 1 : 1);
  const fraction = typeof value === "number" ? Math.min(Math.max(value / (max || 1), 0), 1) : 0;
  const valueAngle = START + fraction * RANGE;

  const CX = 50;
  const CY = 54;
  const R = 36;
  const SW = 10;

  const bgPath = arcPath(CX, CY, R, START, START + RANGE);
  const valPath = fraction > 0 ? arcPath(CX, CY, R, START, valueAngle) : null;

  return (
    <div className="h-full flex flex-col items-center justify-center py-1">
      <svg viewBox="0 0 100 90" className="w-full" style={{ maxHeight: 130 }}>
        <path
          d={bgPath}
          fill="none"
          stroke="var(--surface-container-high)"
          strokeWidth={SW}
          strokeLinecap="round"
        />
        {valPath && (
          <path
            d={valPath}
            fill="none"
            stroke="var(--primary-container)"
            strokeWidth={SW}
            strokeLinecap="round"
          />
        )}
        <text x={CX} y={CY - 2} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight="bold" fontFamily="inherit" fill="var(--on-surface)">{valueLabel}</text>
        <text x={CX} y={CY + 11} textAnchor="middle" dominantBaseline="middle" fontSize={8} fontFamily="inherit" fill="var(--on-surface-variant)">{(fraction * 100).toFixed(0)}% of target</text>
        <text x={18} y={82} textAnchor="middle" fontSize={7} fontFamily="inherit" fill="var(--outline)">0</text>
        {targetLabel && (
          <text x={82} y={82} textAnchor="middle" fontSize={7} fontFamily="inherit" fill="var(--outline)">{targetLabel}</text>
        )}
      </svg>
    </div>
  );
}
