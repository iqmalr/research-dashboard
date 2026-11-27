import { axisLabel, currencyOf, formatValue, getPath, resolveWidget, type SlotIssue } from "@/lib/widget-data";
import type { Format, Widget } from "@/lib/types";
import { BarChart } from "../bar-chart";
import { LineChart } from "../line-chart";
import { StatCard } from "../stat-card";
import { WidgetCard } from "../widget-card";
import { DonutChart } from "../donut-chart";
import { GaugeChart } from "../gauge-chart";
import { ScatterChart } from "../scatter-chart";
import { SparklineChart } from "../sparkline-chart";
import { DataTable } from "../data-table";
import { TableWidget } from "../table-widget";
import { Digest } from "./digest";
import { KpiGrid, RadialFunnel, StatusTiles } from "./item-widgets";

export interface WidgetViewProps {
  widget: Widget;
  /** undefined when the widget points at a source that no longer exists */
  sourceName?: string;
  /** snapshot body for the selected period; undefined when there is none yet */
  data?: unknown;
  /** set when the source is failing and this is older data, e.g. "Data from 19 Nov 02:00 UTC" */
  staleLabel?: string;
}

const OPACITY = [1, 0.8, 0.6, 0.45, 0.3];

function Problem({ icon, title, detail, path, tone = "muted" }: { icon: string; title: string; detail?: string; path?: string; tone?: "muted" | "error" }) {
  const color = tone === "error" ? "text-error" : "text-outline";
  return (
    <div className="h-full min-h-[64px] flex flex-col items-center justify-center text-center gap-1 py-2">
      <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
      <div className={`text-[0.8125rem] font-semibold ${tone === "error" ? "text-error" : "text-on-surface-variant"}`}>{title}</div>
      {path && <code className="font-mono text-[0.75rem] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant break-all">{path}</code>}
      {detail && <div className="text-[0.75rem] text-outline max-w-[32ch]">{detail}</div>}
    </div>
  );
}

const ISSUE_TITLE: Record<SlotIssue["kind"], string> = {
  unbound: "Not configured",
  missing: "Field not found",
  mismatch: "Wrong field type",
};

function issueDetail(i: SlotIssue) {
  const slot = i.slot.startsWith("columns.") ? `column ${Number(i.slot.slice(8)) + 1}` : i.slot;
  return `${slot}: ${i.message}`;
}

export function WidgetView({ widget, sourceName, data, staleLabel }: WidgetViewProps) {
  const frame = (children: React.ReactNode, meta?: string) => (
    <WidgetCard title={widget.title} meta={meta ?? staleLabel} className="h-full">
      {children}
    </WidgetCard>
  );

  if (!sourceName) return frame(<Problem icon="link_off" title="Source removed" detail="Pick another source in the widget editor." />);
  if (data === undefined) return frame(<Problem icon="cloud_off" title="No snapshot yet" detail="Sync the source to load data for this period." />);

  const res = resolveWidget(widget, data);
  if (!res.view) {
    const i = res.issues[0];
    return frame(
      <Problem
        icon={i.kind === "unbound" ? "tune" : "error"}
        tone={i.kind === "unbound" ? "muted" : "error"}
        title={ISSUE_TITLE[i.kind]}
        path={i.path || undefined}
        detail={issueDetail(i)}
      />,
    );
  }

  const currency = currencyOf(data);
  const view = res.view;
  const fmt = (v: unknown, f?: Format) => formatValue(v, f, currency);

  if (view.kind === "stat") {
    const range = getPath(data, "meta.range").value;
    return (
      <StatCard
        title={widget.title}
        value={fmt(view.value, widget.format?.value)}
        delta={typeof view.delta === "number" ? view.delta : undefined}
        description={widget.bindings.delta ? (typeof view.delta === "number" ? `vs. previous ${typeof range === "string" ? range : "period"}` : "No previous period to compare") : undefined}
       
        stale={Boolean(staleLabel)}
        staleLabel={staleLabel}
      />
    );
  }

  if (view.kind === "series") {
    if (view.points.length === 0) return frame(<Problem icon="bar_chart_off" title="No data in this period" />);
    const f = widget.format?.y;
    const total = view.points.reduce((s, p) => s + p.y, 0);
    const points = view.points.map((p) => ({ label: axisLabel(p.x), value: p.y, tip: `${axisLabel(p.x)}: ${fmt(p.y, f)}` }));
    const height = Math.max(96, widget.grid.h * 148 - 150);
    const meta = [f?.unit === "percent" ? null : `Total ${fmt(total, f)}`, staleLabel].filter(Boolean).join(" • ");
    const isArea = widget.type === "area";
    const Chart = (widget.type === "line" || isArea) ? LineChart : BarChart;
    return frame(<Chart data={points} height={height} showAllLabels={points.length <= 12} area={isArea} />, meta);
  }

  if (view.kind === "gauge") {
    const f = widget.format?.value;
    const valLabel = fmt(view.value ?? 0, f);
    const targetLabel = view.target !== null ? fmt(view.target, f) : undefined;
    return frame(<GaugeChart value={view.value} target={view.target} valueLabel={valLabel} targetLabel={targetLabel} />);
  }

  if (view.kind === "scatter") {
    if (view.points.length === 0) return frame(<Problem icon="scatter_plot" title="No data" />);
    const height = Math.max(96, widget.grid.h * 148 - 150);
    return frame(<ScatterChart points={view.points} height={height} />);
  }

  if (view.kind === "sparkline") {
    const f = widget.format?.value;
    const range = getPath(data, "meta.range").value;
    return (
      <WidgetCard title={widget.title} meta={staleLabel} className="h-full">
        <div className="flex flex-col h-full">
          <div className="text-[1.75rem] font-bold text-on-surface leading-none mb-1">{fmt(view.value, f)}</div>
          {typeof view.delta === "number" && (
            <div className={`text-[0.75rem] font-mono mb-2 ${view.delta >= 0 ? "text-emerald-700" : "text-error"}`}>
              {view.delta >= 0 ? "▲" : "▼"} {Math.abs(view.delta).toFixed(1)}% vs. prev {typeof range === "string" ? range : "period"}
            </div>
          )}
          <div className="flex-1 min-h-0">
            <SparklineChart points={view.points} height={48} />
          </div>
        </div>
      </WidgetCard>
    );
  }

  if (view.kind === "items") {
    if (view.items.length === 0) return frame(<Problem icon="donut_small" title="No data" />);
    const f = widget.format?.value;

    if (widget.type === "donut") {
      const slices = view.items.map((it) => ({ label: it.label, value: it.value }));
      return frame(<DonutChart slices={slices} fmt={(v) => fmt(v, f)} />);
    }

    if (widget.type === "radial") return frame(<RadialFunnel items={view.items} fmt={(v) => fmt(v, f)} />);
    if (widget.type === "kpis") return <KpiGrid cols={widget.grid.w >= 12 ? 4 : undefined} items={view.items} fmt={(v) => fmt(v, f)} />;
    if (widget.type === "tiles") return frame(<StatusTiles items={view.items} fmt={(v) => fmt(v, f)} />);
    if (widget.type === "digest") return frame(<Digest items={view.items.map((it) => ({ label: it.label, text: fmt(it.value, f) }))} />);

    if (widget.type === "list") {
      const max = view.items[0]?.value || 1;
      return frame(
        <div className="space-y-2.5 pt-1 overflow-y-auto">
          {view.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="font-mono text-[0.75rem] text-outline w-5 text-right shrink-0">{i + 1}</span>
              <span className="flex-1 truncate text-[0.8125rem] text-on-surface">{it.label}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: `${(it.value / max) * 100}%` }} />
                </div>
                <span className="font-mono font-semibold text-[0.75rem] text-on-surface tabular-nums w-16 text-right">{fmt(it.value, f)}</span>
              </div>
            </div>
          ))}
        </div>,
      );
    }

    if (widget.type === "heatmap") {
      const max = Math.max(...view.items.map((it) => it.value), 1);
      return frame(
        <div className="grid gap-1 pt-1" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(72px, 1fr))` }}>
          {view.items.map((it, i) => {
            const intensity = Math.min(it.value / max, 1);
            return (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded p-2 text-center"
                style={{ background: `color-mix(in srgb, var(--primary-container) ${Math.round(intensity * 70 + 10)}%, var(--surface-container))` }}
                title={`${it.label}: ${fmt(it.value, f)}`}
              >
                <span className="text-[0.625rem] text-on-surface-variant truncate w-full">{it.label}</span>
                <span className="font-mono font-semibold text-[0.75rem] text-on-surface tabular-nums">{fmt(it.value, f)}</span>
              </div>
            );
          })}
        </div>,
      );
    }

    if (widget.type === "funnel") {
      const first = view.items[0].value || 1;
      return frame(
        <div className="space-y-2 pt-1">
          {view.items.map((s, i) => {
            const pct = (s.value / first) * 100;
            const prev = i > 0 ? view.items[i - 1].value : 0;
            return (
              <div key={i} className="p-2.5 rounded-[6px] bg-surface-container-low border border-outline-variant/20">
                <div className="flex justify-between items-center mb-1.5 gap-2">
                  <span className="font-medium text-[0.8125rem] text-on-surface truncate">
                    {i + 1}. {s.label}
                  </span>
                  <span className="font-mono text-[0.75rem] text-on-surface font-semibold [font-variant-numeric:tabular-nums]">{fmt(s.value, f)}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: `${Math.min(pct, 100)}%`, opacity: i === 0 ? 1 : 0.7 }} />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-outline">
                  <span>{i === 0 ? "100% baseline" : `${pct.toFixed(1)}% of total`}</span>
                  {i === 0 ? (
                    <span className="text-outline-variant">entry step</span>
                  ) : prev > 0 ? (
                    <span className="text-emerald-700 font-medium">{((s.value / prev) * 100).toFixed(1)}% step conv</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>,
      );
    }

    const total = view.items.reduce((s, it) => s + it.value, 0);
    return frame(
      <div className="space-y-3.5 pt-1">
        {view.items.map((it, i) => {
          const pct = total > 0 ? (it.value / total) * 100 : 0;
          return (
            <div key={i}>
              <div className="flex justify-between text-[0.8125rem] mb-1 gap-2">
                <span className="font-mono text-on-surface font-medium truncate">{it.label}</span>
                <span className="text-on-surface [font-variant-numeric:tabular-nums] shrink-0">
                  <strong className="font-semibold">{fmt(it.value, f)}</strong> <span className="text-outline text-[11px]">({pct.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary-container rounded-full" style={{ width: `${pct}%`, opacity: OPACITY[i] ?? 0.25 }} />
              </div>
            </div>
          );
        })}
      </div>,
    );
  }

  // table
  if (view.rows.length === 0) return frame(<Problem icon="table_rows" title="No rows" />);
  if (widget.type === "datatable")
    return <DataTable title={widget.title} columns={view.columns} rows={view.rows} currency={currency} search={widget.tableOptions?.search} sortable={widget.tableOptions?.sortable} pageSize={widget.tableOptions?.pageSize} />;
  return frame(
    <TableWidget
      columns={view.columns}
      rows={view.rows}
      currency={currency}
      search={widget.tableOptions?.search}
      sortable={widget.tableOptions?.sortable}
      pageSize={widget.tableOptions?.pageSize}
    />,
  );
}
