interface SparklineProps {
  points: { x: string; y: number }[];
  height?: number;
}

export function SparklineChart({ points, height = 40 }: SparklineProps) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.y), 1);
  const n = points.length;
  const px = (i: number) => (i / (n - 1)) * 100;
  const py = (v: number) => 100 - (v / max) * 90;
  const line = points.map((p, i) => `${px(i)},${py(p.y)}`).join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
      aria-hidden
    >
      <polygon points={`0,100 ${line} 100,100`} fill="var(--primary-container)" opacity={0.12} />
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary-container)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
