export interface BreakdownItem {
  label: string;
  value: number;
  color: string;
}

export function BreakdownBar({ items }: { items: BreakdownItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="space-y-3">
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {items.map(({ value, color }, i) => (
          <div key={i} style={{ flex: value, backgroundColor: color }} />
        ))}
      </div>
      <div className="space-y-2">
        {items.map(({ label, value, color }, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-fg-2 truncate">{label}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono tabular-nums text-fg">
                {value.toLocaleString("en-US")}
              </span>
              <span className="text-xs font-mono tabular-nums text-fg-muted w-8 text-right">
                {total > 0 ? ((value / total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
