import type { Format, TableColumn, Widget } from "./types";

/* ── Path ─────────────────────────────────────────────────────
   Dots walk into objects (`users.admin.total`), numbers index arrays
   (`plans.0.name`). No wildcards, filters or functions. */

const MISS = { found: false as const, value: undefined };

export function getPath(root: unknown, path: string): { found: boolean; value: unknown } {
  if (!path) return MISS;
  let cur: unknown = root;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return MISS;
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(part) || Number(part) >= cur.length) return MISS;
      cur = cur[Number(part)];
    } else {
      if (!Object.prototype.hasOwnProperty.call(cur, part)) return MISS;
      cur = (cur as Record<string, unknown>)[part];
    }
  }
  return { found: true, value: cur };
}

export type JsonType = "number" | "string" | "boolean" | "null" | "array" | "object";

export function typeOf(v: unknown): JsonType {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return "array";
  const t = typeof v;
  return t === "number" || t === "string" || t === "boolean" ? t : "object";
}

const TYPE_WORD: Record<JsonType, string> = {
  number: "a number",
  string: "text",
  boolean: "true/false",
  null: "null",
  array: "a list",
  object: "an object",
};

export const isScalar = (v: unknown) => ["number", "string", "boolean", "null"].includes(typeOf(v));
export const isNumeric = (v: unknown) => ["number", "null"].includes(typeOf(v));

/* ── Resolve a widget against one snapshot ────────────────── */

export interface SlotIssue {
  slot: string;
  path: string;
  kind: "unbound" | "missing" | "mismatch";
  message: string;
}

export type WidgetViewData =
  | { kind: "stat"; value: string | number | boolean | null; delta: number | null | undefined }
  | { kind: "series"; points: { x: string; y: number }[] }
  | { kind: "items"; items: { label: string; value: number; chip?: string; note?: string; text?: string }[] }
  | { kind: "table"; columns: TableColumn[]; rows: unknown[] }
  | { kind: "gauge"; value: number | null; target: number | null }
  | { kind: "scatter"; points: { x: number; y: number; label: string }[] }
  | { kind: "sparkline"; value: string | number | boolean | null; delta: number | null | undefined; points: { x: string; y: number }[] };

export interface Resolved {
  issues: SlotIssue[];
  view?: WidgetViewData;
  /** number of rows behind the `rows` binding, when it resolved */
  rowCount?: number;
}

export function resolveWidget(widget: Widget, data: unknown): Resolved {
  const issues: SlotIssue[] = [];
  const b = widget.bindings;

  const scalar = (slot: string, numeric: boolean, optional = false): unknown => {
    const path = b[slot];
    if (!path) {
      if (!optional) issues.push({ slot, path: "", kind: "unbound", message: "No field selected" });
      return undefined;
    }
    const r = getPath(data, path);
    if (!r.found) {
      issues.push({ slot, path, kind: "missing", message: "Field not found in the response" });
      return undefined;
    }
    if (numeric ? !isNumeric(r.value) : !isScalar(r.value)) {
      issues.push({
        slot,
        path,
        kind: "mismatch",
        message: `Expected ${numeric ? "a number" : "a number or text"}, got ${TYPE_WORD[typeOf(r.value)]}`,
      });
      return undefined;
    }
    return r.value;
  };

  const rows = (): unknown[] | undefined => {
    const path = b.rows;
    if (!path) {
      issues.push({ slot: "rows", path: "", kind: "unbound", message: "No list selected" });
      return undefined;
    }
    const r = getPath(data, path);
    if (!r.found) {
      issues.push({ slot: "rows", path, kind: "missing", message: "Field not found in the response" });
      return undefined;
    }
    if (!Array.isArray(r.value)) {
      issues.push({ slot: "rows", path, kind: "mismatch", message: `Expected a list, got ${TYPE_WORD[typeOf(r.value)]}` });
      return undefined;
    }
    return r.value;
  };

  /** Checks a field against the first row. An empty list has nothing to check. */
  const rowField = (list: unknown[], slot: string, path: string | undefined, numeric: boolean): boolean => {
    if (!path) {
      issues.push({ slot, path: "", kind: "unbound", message: "No field selected" });
      return false;
    }
    if (list.length === 0) return true;
    const r = getPath(list[0], path);
    if (!r.found) {
      issues.push({ slot, path, kind: "missing", message: "Field not found in the rows" });
      return false;
    }
    if (numeric ? !isNumeric(r.value) : !isScalar(r.value)) {
      issues.push({
        slot,
        path,
        kind: "mismatch",
        message: `Expected ${numeric ? "a number" : "a number or text"}, got ${TYPE_WORD[typeOf(r.value)]}`,
      });
      return false;
    }
    return true;
  };

  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));

  if (widget.type === "stat") {
    const value = scalar("value", false);
    const delta = scalar("delta", true, true);
    if (issues.length) return { issues };
    return {
      issues,
      view: { kind: "stat", value: value as string | number | boolean | null, delta: delta as number | null | undefined },
    };
  }

  if (widget.type === "gauge") {
    const val = scalar("value", true);
    const tgt = scalar("target", true, true);
    if (issues.length) return { issues };
    return {
      issues,
      view: { kind: "gauge", value: val as number | null, target: tgt as number | null },
    };
  }

  const list = rows();
  if (!list) return { issues };
  const rowCount = list.length;

  if (widget.type === "bar" || widget.type === "line" || widget.type === "area") {
    const okX = rowField(list, "x", b.x, false);
    const okY = rowField(list, "y", b.y, true);
    if (!okX || !okY) return { issues, rowCount };
    return {
      issues,
      rowCount,
      view: { kind: "series", points: list.map((r) => ({ x: text(getPath(r, b.x).value), y: num(getPath(r, b.y).value) })) },
    };
  }

  if (widget.type === "breakdown" || widget.type === "funnel" || widget.type === "donut" || widget.type === "list" || widget.type === "heatmap" || widget.type === "radial" || widget.type === "tiles" || widget.type === "digest" || widget.type === "kpis") {
    const okL = rowField(list, "label", b.label, false);
    const okV = rowField(list, "value", b.value, true);
    if (!okL || !okV) return { issues, rowCount };
    return {
      issues,
      rowCount,
      view: {
        kind: "items",
        items: list.map((r) => {
          const extra = (k: "chip" | "note" | "text") => {
            const v = b[k] ? getPath(r, b[k]!).value : undefined;
            return v === undefined || v === null || v === "" ? undefined : String(v);
          };
          return { label: text(getPath(r, b.label).value), value: num(getPath(r, b.value).value), chip: extra("chip"), note: extra("note"), text: extra("text") };
        }),
      },
    };
  }

  if (widget.type === "scatter") {
    const okX = rowField(list, "x", b.x, true);
    const okY = rowField(list, "y", b.y, true);
    if (!okX || !okY) return { issues, rowCount };
    const hasLabel = Boolean(b.label);
    return {
      issues,
      rowCount,
      view: {
        kind: "scatter",
        points: list.map((r) => ({
          x: num(getPath(r, b.x).value),
          y: num(getPath(r, b.y).value),
          label: hasLabel ? text(getPath(r, b.label!).value) : "",
        })),
      },
    };
  }

  if (widget.type === "sparkline") {
    const value = scalar("value", false);
    const delta = scalar("delta", true, true);
    const okX = rowField(list, "x", b.x, false);
    const okY = rowField(list, "y", b.y, true);
    if (issues.length) return { issues, rowCount };
    if (!okX || !okY) return { issues, rowCount };
    return {
      issues,
      rowCount,
      view: {
        kind: "sparkline",
        value: value as string | number | boolean | null,
        delta: delta as number | null | undefined,
        points: list.map((r) => ({ x: text(getPath(r, b.x).value), y: num(getPath(r, b.y).value) })),
      },
    };
  }

  const columns = widget.columns ?? [];
  if (columns.length === 0) {
    issues.push({ slot: "columns", path: "", kind: "unbound", message: "No columns selected" });
    return { issues, rowCount };
  }
  columns.forEach((c, i) => rowField(list, `columns.${i}`, c.field, false));
  if (issues.length) return { issues, rowCount };
  return { issues, rowCount, view: { kind: "table", columns, rows: list } };
}

/* ── Format ───────────────────────────────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-21" -> "21 Nov 2026", "2026-11" -> "Nov 2026". Anything else is returned as is. */
export function formatDate(v: unknown): string {
  const s = String(v ?? "");
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:T(\d{2}):(\d{2}))?/.exec(s);
  if (!m) return s;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  if (!m[3]) return `${month} ${m[1]}`;
  const day = `${Number(m[3])} ${month} ${m[1]}`;
  return m[4] ? `${day} ${m[4]}:${m[5]}` : day;
}

/** Short axis label: "2026-11-21" -> "Nov 21", "2026-11" -> "Nov". */
export function axisLabel(v: string): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(v);
  if (!m) return v;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return m[3] ? `${month} ${Number(m[3])}` : month;
}

export function formatValue(v: unknown, fmt: Format | undefined, currency = "eur"): string {
  if (v === null || v === undefined || v === "") return "—";
  const unit = fmt?.unit ?? (typeof v === "number" ? "number" : "text");
  if (unit === "text") return String(v);
  if (unit === "date") return formatDate(v);
  if (typeof v !== "number") return String(v);
  if (unit === "bytes") {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let n = v;
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(fmt?.decimals ?? (i === 0 ? 0 : 1))} ${units[i]}`;
  }
  if (unit === "percent") return `${v.toFixed(fmt?.decimals ?? 1)}%`;
  if (unit === "currency") {
    const d = fmt?.decimals ?? 0;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      }).format(v / 100); // money arrives in the smallest unit
    } catch {
      return `${(v / 100).toFixed(d)} ${currency}`;
    }
  }
  const d = fmt?.decimals ?? (Number.isInteger(v) ? 0 : 1);
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function currencyOf(data: unknown): string {
  const c = getPath(data, "meta.currency").value;
  return typeof c === "string" && c ? c : "eur";
}
