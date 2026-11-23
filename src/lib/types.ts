export const PERIODS = ["7d", "30d", "90d", "12m"] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = "30d";

export function parsePeriod(v: unknown): Period {
  return PERIODS.includes(v as Period) ? (v as Period) : DEFAULT_PERIOD;
}

export const WIDGET_TYPES = ["stat", "bar", "line", "breakdown", "funnel", "table"] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const UNITS = ["number", "currency", "percent", "bytes", "date", "text"] as const;
export type Unit = (typeof UNITS)[number];

export interface Format {
  unit: Unit;
  decimals?: number;
}

export interface TableColumn {
  label: string;
  field: string;
  format?: Format;
}

export interface GridPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  source_id: string;
  /** slot -> path. `rows` is a path into the response, row slots are paths inside one row. */
  bindings: Record<string, string>;
  /** table only */
  columns?: TableColumn[];
  /** slot -> format */
  format?: Record<string, Format>;
  grid: GridPos;
}

export interface DashboardPage {
  id: string;
  name: string;
  widgets: Widget[];
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  pages: DashboardPage[];
}

export type SourceErrorKind = "auth" | "rate_limit" | "http" | "timeout" | "network" | "invalid" | "blocked";

export const SOURCE_KINDS = ["endpoint", "stripe", "paypal", "brevo", "ga4", "gsc"] as const;
/** "endpoint" is a JSON URL of our own; the others are third-party connectors (see lib/connectors). */
export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface Source {
  id: string;
  /** a source belongs to one dashboard and is shared by its widgets */
  dashboardId: string;
  kind: SourceKind;
  name: string;
  /** only for kind "endpoint", empty otherwise */
  url: string;
  /** credentials, encrypted (see lib/secrets). Never leaves the server. */
  secret: string;
  /** masked credential shown in the UI, e.g. "rk_live_••••4f2a" */
  keyHint: string;
  /** non-secret connector settings: GA4 property id, Search Console site, currency… */
  config: Record<string, string>;
  status: "ok" | "error" | "never";
  lastError?: { kind: SourceErrorKind; message: string; at: string };
  lastSyncAt?: string;
  createdAt: string;
}

/** What the browser is allowed to see: never the credentials. */
export type SourceInfo = Omit<Source, "secret">;

export type FetchResult =
  | { ok: true; status: number; ms: number; bytes: number; data: unknown }
  | { ok: false; kind: SourceErrorKind; status?: number; ms: number; message: string };

export interface Snapshot {
  sourceId: string;
  period: Period;
  fetchedAt: string;
  bytes: number;
  data: unknown;
}

export interface SyncRun {
  id: string;
  sourceId: string;
  sourceName: string;
  period: Period;
  status: "success" | "failed";
  httpStatus?: number;
  durationMs: number;
  bytes: number;
  error?: string;
  at: string;
}

export interface Store {
  version: 3;
  dashboards: Dashboard[];
  sources: Source[];
  /** key: `${sourceId}:${period}` */
  snapshots: Record<string, Snapshot>;
  runs: SyncRun[];
}

export const snapKey = (sourceId: string, period: Period) => `${sourceId}:${period}`;

/* ── Widget slots ─────────────────────────────────────────── */

export type SlotKind = "scalar" | "number" | "rows" | "rowField" | "rowNumber";

export interface SlotDef {
  key: string;
  label: string;
  kind: SlotKind;
  optional?: boolean;
  /** this slot's value can be given a unit/decimals */
  formattable?: boolean;
}

const ROWS: SlotDef = { key: "rows", label: "Rows", kind: "rows" };

export const SLOTS: Record<WidgetType, SlotDef[]> = {
  stat: [
    { key: "value", label: "Value", kind: "scalar", formattable: true },
    { key: "delta", label: "Delta (%)", kind: "number", optional: true },
  ],
  bar: [ROWS, { key: "x", label: "X axis", kind: "rowField" }, { key: "y", label: "Y axis", kind: "rowNumber", formattable: true }],
  line: [ROWS, { key: "x", label: "X axis", kind: "rowField" }, { key: "y", label: "Y axis", kind: "rowNumber", formattable: true }],
  breakdown: [ROWS, { key: "label", label: "Label", kind: "rowField" }, { key: "value", label: "Value", kind: "rowNumber", formattable: true }],
  funnel: [ROWS, { key: "label", label: "Label", kind: "rowField" }, { key: "value", label: "Value", kind: "rowNumber", formattable: true }],
  table: [ROWS],
};

export const DEFAULT_SIZE: Record<WidgetType, { w: number; h: number }> = {
  stat: { w: 3, h: 1 },
  bar: { w: 8, h: 2 },
  line: { w: 8, h: 2 },
  breakdown: { w: 4, h: 2 },
  funnel: { w: 4, h: 2 },
  table: { w: 8, h: 2 },
};

export const WIDGET_META: Record<WidgetType, { label: string; icon: string; desc: string }> = {
  stat: { label: "Stat", icon: "bar_chart_4_bars", desc: "Single value with optional delta" },
  bar: { label: "Bar", icon: "bar_chart", desc: "Values over time or categories" },
  line: { label: "Line", icon: "show_chart", desc: "Trend over a period" },
  breakdown: { label: "Breakdown", icon: "donut_small", desc: "Share per category" },
  funnel: { label: "Funnel", icon: "filter_alt", desc: "Step-by-step drop-off" },
  table: { label: "Table", icon: "table_chart", desc: "Rows with chosen columns" },
};
