export interface ScatterPoint {
  x: number;
  y: number;
  label: string;
}

interface ScatterChartProps {
  points: ScatterPoint[];
  height?: number;
  fmtX?: (v: number) => string;
  fmtY?: (v: number) => string;
}

export function ScatterChart({ points, height = 160, fmtX, fmtY }: ScatterChartProps) {
  if (points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const pad = 8;

  const svgX = (x: number) => pad + ((x - xMin) / xRange) * (100 - pad * 2);
  const svgY = (y: number) => 100 - pad - ((y - yMin) / yRange) * (100 - pad * 2);

  const fmt = (v: number, f?: (v: number) => string) =>
    f ? f(v) : v.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div className="h-full flex flex-col">
      <div className="relative w-full flex-1" style={{ minHeight: height }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {[0.25, 0.5, 0.75].map((t) => (
            <g key={t}>
              <line x1={pad} y1={svgY(yMin + t * yRange)} x2={100 - pad} y2={svgY(yMin + t * yRange)} stroke="var(--surface-container)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
              <line x1={svgX(xMin + t * xRange)} y1={pad} x2={svgX(xMin + t * xRange)} y2={100 - pad} stroke="var(--surface-container)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={svgX(p.x)}
              cy={svgY(p.y)}
              r={2.5}
              fill="var(--primary-container)"
              opacity={0.85}
              vectorEffect="non-scaling-stroke"
            >
              <title>{p.label ? `${p.label}: (${fmt(p.x, fmtX)}, ${fmt(p.y, fmtY)})` : `(${fmt(p.x, fmtX)}, ${fmt(p.y, fmtY)})`}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="flex justify-between pt-1.5 font-mono text-[11px] text-outline">
        <span>{fmt(xMin, fmtX)}</span>
        <span className="text-outline-variant">x axis</span>
        <span>{fmt(xMax, fmtX)}</span>
      </div>
    </div>
  );
}
