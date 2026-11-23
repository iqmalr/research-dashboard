interface WidgetCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  meta?: string;
  source?: string;
}

export function WidgetCard({ title, children, className, meta, source }: WidgetCardProps) {
  return (
    <div
      className={[
        "bg-surface-container-lowest border border-outline-variant/30 rounded-[8px] p-3 flex flex-col",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between border-b border-surface-container pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[1.125rem] leading-6 tracking-[-0.01em] font-semibold text-on-surface">
              {title}
            </span>
            {meta && (
              <>
                <span className="text-outline text-[0.75rem]">•</span>
                <span className="font-mono text-[0.75rem] text-outline">{meta}</span>
              </>
            )}
          </div>
          <button
            className="text-outline hover:text-on-surface p-0.5 rounded transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">more_horiz</span>
          </button>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>

      {source && (
        <div className="mt-3 pt-1 border-t border-surface-container font-mono text-[0.75rem] text-outline truncate">
          source: <span className="text-on-surface-variant">{source}</span>
        </div>
      )}
    </div>
  );
}
