import { ChartGrid, ChartXAxis, type ChartPoint } from "./bar-chart";

interface LineChartProps {
  data: ChartPoint[];
  height?: number;
  showAllLabels?: boolean;
}

export function LineChart({ data, height = 160, showAllLabels = false }: LineChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  // viewBox is 100×100 and stretched; strokes stay crisp via non-scaling-stroke
  const px = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const py = (v: number) => 100 - (v / max) * 88;
  const line = data.map((d, i) => `${px(i)},${py(d.value)}`).join(" ");

  return (
    <div className="h-full flex flex-col">
      <div className="relative w-full flex-1" style={{ minHeight: height }}>
        <ChartGrid />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <polygon points={`0,100 ${line} 100,100`} fill="var(--primary-container)" opacity={0.08} />
          <polyline
            points={line}
            fill="none"
            stroke="var(--primary-container)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* hover targets, one per point */}
        <div className="absolute inset-0 flex">
          {data.map((d, i) => (
            <div key={i} className="flex-1 h-full hover:bg-primary-container/5" title={d.tip ?? `${d.label}: ${d.value.toLocaleString("en-US")}`} />
          ))}
        </div>
      </div>
      <ChartXAxis data={data} showAllLabels={showAllLabels} />
    </div>
  );
}
