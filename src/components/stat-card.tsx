interface StatCardProps {
  title: string;
  value: number | string;
  delta?: number;
  prefix?: string;
  suffix?: string;
  description?: string;
  stale?: boolean;
  staleLabel?: string;
}

export function StatCard({
  title,
  value,
  delta,
  prefix,
  suffix,
  description,
  stale,
  staleLabel,
}: StatCardProps) {
  const formatted =
    typeof value === "number" ? value.toLocaleString("en-US") : value;
  const isPositive = delta !== undefined && delta >= 0;

  return (
    <div className="card flex flex-col justify-between hover:border-outline-variant/60 transition-colors">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[0.75rem] leading-4 tracking-[0.02em] font-semibold uppercase text-on-surface-variant">
            {title}
          </span>
          <button
            className="text-outline hover:text-on-surface p-0.5 rounded transition-colors"
            title="Widget menu"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">more_horiz</span>
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className={["text-[1.75rem] leading-9 tracking-tight font-semibold text-on-surface [font-variant-numeric:tabular-nums]", stale ? "opacity-50" : ""].join(" ")}>
            {prefix && (
              <span className="text-[1.25rem] text-on-surface-variant mr-0.5">{prefix}</span>
            )}
            {formatted}
            {suffix && (
              <span className="text-[1.25rem] text-on-surface-variant ml-0.5">{suffix}</span>
            )}
          </span>
          {delta !== undefined && (
            <span
              className={[
                "inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded border [font-variant-numeric:tabular-nums]",
                isPositive
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : "text-error bg-error-container border-error/20",
              ].join(" ")}
            >
              {isPositive ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          )}
        </div>

        {description && (
          <p className="text-[0.8125rem] text-outline mt-0.5">{description}</p>
        )}
      </div>

      {stale && (
        <div className="mt-2 flex items-center gap-1 text-amber-700 text-[0.6875rem] font-medium">
          <span className="material-symbols-outlined text-[13px]">schedule</span>
          <span>{staleLabel ?? "Stale data"}</span>
        </div>
      )}
    </div>
  );
}
