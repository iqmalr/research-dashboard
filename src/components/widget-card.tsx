interface WidgetCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  meta?: string;
}

export function WidgetCard({ title, children, className, meta }: WidgetCardProps) {
  return (
    <div
      className={[
        "card flex flex-col",
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
    </div>
  );
}
