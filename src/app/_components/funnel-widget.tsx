export interface FunnelStep {
  label: string;
  value: number;
}

export function FunnelWidget({ steps }: { steps: FunnelStep[] }) {
  const max = steps[0]?.value ?? 1;
  return (
    <div className="space-y-2.5">
      {steps.map(({ label, value }, i) => {
        const pct =
          i > 0
            ? ((value / steps[i - 1].value) * 100).toFixed(0)
            : null;
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-fg-2">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-fg">
                  {value.toLocaleString("en-US")}
                </span>
                {pct !== null && (
                  <span className="text-[10px] font-mono tabular-nums text-fg-muted w-8 text-right">
                    {pct}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-surface-low rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(value / max) * 100}%`,
                  backgroundColor: "var(--accent)",
                  opacity: Math.max(1 - i * 0.12, 0.3),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
