export interface Item {
  label: string;
  value: number;
}
type Fmt = (v: number) => string;

const TONES = ["#2563eb", "#6366f1", "#60a5fa", "#93c5fd", "#bfdbfe"];
const TILE = [
  { bg: "#dcfce7", fg: "#15803d" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#2563eb", fg: "#ffffff" },
  { bg: "#fef3c7", fg: "#b45309" },
  { bg: "#fce7f3", fg: "#be185d" },
];

/** Concentric rings, one per step, sweep = share of first step. */
export function RadialFunnel({ items, fmt }: { items: Item[]; fmt: Fmt }) {
  const first = items[0]?.value || 1;
  const ring = 9;
  return (
    <div className="flex flex-col items-center gap-3 py-1">
      <svg viewBox="0 0 100 100" width={150} height={150} className="-rotate-90 shrink-0">
        {items.slice(0, 5).map((it, i) => {
          const r = 46 - i * (ring + 2);
          const c = 2 * Math.PI * r;
          const frac = Math.min(it.value / first, 1);
          return (
            <g key={i}>
              <circle cx={50} cy={50} r={r} fill="none" stroke="var(--surface-container)" strokeWidth={ring} />
              <circle cx={50} cy={50} r={r} fill="none" stroke={TONES[i]} strokeWidth={ring} strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`}>
                <title>{`${it.label}: ${fmt(it.value)}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="w-full space-y-1.5">
        {items.map((it, i) => {
          const prev = i > 0 ? items[i - 1].value : 0;
          const drop = i > 0 && prev > 0 ? (1 - it.value / prev) * 100 : null;
          return (
            <div key={i} className="text-[0.75rem]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: TONES[Math.min(i, 4)] }} />
                <span className="flex-1 truncate text-on-surface">{it.label}</span>
                <span className="font-mono font-semibold tabular-nums">{fmt(it.value)}</span>
                <span className="font-mono text-outline tabular-nums w-9 text-right">{((it.value / first) * 100).toFixed(0)}%</span>
              </div>
              {drop !== null && drop > 0 && <div className="pl-[18px] text-error">▼ {drop.toFixed(0)}% from previous</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Row of colored tiles, big % share + value. */
export function StatusTiles({ items, fmt }: { items: Item[]; fmt: Fmt }) {
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}>
      {items.map((it, i) => {
        const t = TILE[i % TILE.length];
        return (
          <div key={i} className="rounded-lg p-3 min-w-0" style={{ background: t.bg, color: t.fg }}>
            <div className="text-[0.75rem] truncate">{it.label}</div>
            <div className="text-[2rem] leading-tight font-light tabular-nums">{((it.value / total) * 100).toFixed(0)}%</div>
            <div className="text-[0.6875rem] opacity-80">{fmt(it.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

const chipTone = (c: string) =>
  /^\+/.test(c) || c.startsWith("▲") ? "bg-emerald-50 text-emerald-700" : /^-/.test(c) || c.startsWith("▼") ? "bg-red-50 text-red-700" : "bg-surface-container text-on-surface-variant";

/** Frameless grid of big numbers: chip + note under each value. */
export function KpiGrid({ items, fmt, cols: colsProp }: { cols?: number; items: (Item & { chip?: string; note?: string; text?: string })[]; fmt: Fmt }) {
  const cols = colsProp ?? (items.length > 4 ? 3 : 2);
  return (
    <div className="card !p-0 h-full overflow-hidden grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "1fr" }}>
      {items.map((it, i) => (
        <div
          key={i}
          className={`px-5 py-4 min-w-0 flex flex-col justify-center border-outline-variant/30 ${i % cols ? "border-l" : ""} ${i >= cols ? "border-t" : ""}`}
        >
          <div className="text-[0.8125rem] text-on-surface-variant truncate">{it.label}</div>
          {(() => {
            const v = it.text ?? fmt(it.value);
            return <div className={`${v.length > 11 ? "text-[2rem]" : "text-[2.75rem]"} leading-[1.15] tracking-[-0.02em] font-light tabular-nums truncate`} title={v}>{v}</div>;
          })()}
          {(it.chip || it.note) && (
            <div className="flex items-center gap-2 mt-1 text-[0.75rem] text-outline min-h-5">
              {it.chip && <span className={`px-1.5 py-0.5 rounded font-medium tabular-nums ${chipTone(it.chip)}`}>{it.chip}</span>}
              {it.note && <span className="truncate">{it.note}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
