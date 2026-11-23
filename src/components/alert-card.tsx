type AlertType = "warning" | "error" | "info";

interface AlertCardProps {
  type: AlertType;
  title: string;
  value: string;
  detail?: string;
}

const styles: Record<
  AlertType,
  { bg: string; border: string; dot: string; text: string }
> = {
  warning: { bg: "#fffbeb", border: "#fde68a", dot: "#d97706", text: "#92400e" },
  error:   { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626", text: "#991b1b" },
  info:    { bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a", text: "#166534" },
};

export function AlertCard({ type, title, value, detail }: AlertCardProps) {
  const s = styles[type];
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
    >
      <div className="flex items-start gap-2">
        <div
          className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: s.dot }}
        />
        <div className="min-w-0">
          <div
            className="text-xs font-semibold leading-tight"
            style={{ color: s.text }}
          >
            {title}
          </div>
          <div
            className="text-xs font-mono font-medium mt-0.5 tabular-nums"
            style={{ color: s.text }}
          >
            {value}
          </div>
          {detail && (
            <div className="text-[10px] mt-0.5 text-fg-muted">{detail}</div>
          )}
        </div>
      </div>
    </div>
  );
}
