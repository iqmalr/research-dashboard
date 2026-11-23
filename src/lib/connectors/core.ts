import { PERIODS, type DashboardPage, type Format, type Period, type SourceErrorKind, type TableColumn, type Widget } from "../types";
import { demoResponse } from "./demo";

/* ── Contract ─────────────────────────────────────────────── */

export class ConnectorError extends Error {
  constructor(
    public kind: SourceErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export interface Ctx {
  credentials: Record<string, string>;
  config: Record<string, string>;
  /** development only: answer from generated fixtures instead of the network */
  demo: boolean;
  /** epoch ms after which no new request is started */
  deadline: number;
  now: Date;
}

export interface Connector {
  /**
   * All four periods from one pass over the service. A connector pulls its
   * history once and cuts the periods out of it, instead of being called once
   * per period like a JSON endpoint.
   */
  fetchAll(ctx: Ctx): Promise<Record<Period, unknown>>;
  /** masked credential for the UI */
  hint(credentials: Record<string, string>, config: Record<string, string>): string;
  /** a ready-made page whose widgets read this connector's output */
  page(sourceId: string): DashboardPage;
}

/* ── HTTP ─────────────────────────────────────────────────── */

const REQUEST_TIMEOUT_MS = 20_000;

interface CallInit {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

/**
 * One JSON request to a fixed third-party host. `service` names it in error
 * messages, `detail` pulls the service's own error text out of a failed body.
 */
export async function call(ctx: Ctx, service: string, url: string, init: CallInit = {}, detail?: (body: unknown) => unknown): Promise<unknown> {
  if (Date.now() > ctx.deadline) throw new ConnectorError("timeout", `${service} sync ran out of time and was stopped`);

  let status: number;
  let text: string;
  if (ctx.demo) {
    ({ status, text } = demoResponse(url, init.body));
  } else {
    try {
      const res = await fetch(url, {
        method: init.method ?? "GET",
        headers: { Accept: "application/json", ...init.headers },
        body: init.body,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      status = res.status;
      text = await res.text();
    } catch (e) {
      const name = (e as Error).name;
      if (name === "TimeoutError" || name === "AbortError") throw new ConnectorError("timeout", `${service} did not answer within ${REQUEST_TIMEOUT_MS / 1000}s`);
      throw new ConnectorError("network", `${service} is unreachable`);
    }
  }

  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ConnectorError("invalid", `${service} answered with something that is not JSON (HTTP ${status})`, status);
  }
  if (status >= 200 && status < 300) return body;

  let why: unknown;
  try {
    why = detail?.(body);
  } catch {}
  const reason = typeof why === "string" && why ? why.slice(0, 300) : `HTTP ${status}`;
  if (status === 401 || status === 403) throw new ConnectorError("auth", `${service} refused the credentials: ${reason}`, status);
  if (status === 429) throw new ConnectorError("rate_limit", `${service} is rate limiting (429)`, status);
  throw new ConnectorError("http", `${service}: ${reason}`, status);
}

/** Runs an optional part of a sync. A permission problem becomes a warning instead of failing everything. */
export async function optional<T>(warnings: string[], what: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ConnectorError && e.kind === "auth" && e.status === 403) {
      warnings.push(`${what} skipped: ${e.message}`);
      return null;
    }
    throw e;
  }
}

/* ── Days and periods ─────────────────────────────────────── */

export const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };
/** enough history for the longest period plus the one before it */
export const FULL_HISTORY_DAYS = 2 * PERIOD_DAYS["12m"];

const DAY_MS = 86_400_000;
export const dayKey = (d: Date | number) => new Date(d).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => dayKey(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS);
export const round1 = (n: number) => Math.round(n * 10) / 10;
export const pct = (part: number, whole: number) => (whole > 0 ? round1((part / whole) * 100) : 0);

/** day ("2026-11-23", UTC) -> metric -> sum */
export type Daily = Map<string, Record<string, number>>;

export function bump(daily: Daily, day: string, metric: string, n: number) {
  const row = daily.get(day) ?? {};
  row[metric] = (row[metric] ?? 0) + n;
  daily.set(day, row);
}

export interface Stat {
  value: number;
  previous: number | null;
  delta_pct: number | null;
}

export function stat(value: number, previous: number | null): Stat {
  return { value, previous, delta_pct: previous ? round1(((value - previous) / previous) * 100) : null };
}

type Sums = Record<string, number>;

function sumRange(daily: Daily, metrics: string[], from: string, to: string): Sums {
  const out: Sums = Object.fromEntries(metrics.map((m) => [m, 0]));
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const row = daily.get(day);
    if (row) for (const m of metrics) out[m] += row[m] ?? 0;
  }
  return out;
}

export interface Window {
  from: string;
  to: string;
  sums: Sums;
  /** null when the history does not reach back far enough for a fair comparison */
  previous: Sums | null;
  /** one row per day, or per month for 12m */
  rows: { date: string; sums: Sums }[];
}

/**
 * Cuts one period out of the daily sums: the window ending at `end`, the
 * window of the same length before it, and the rows for charts.
 */
export function windowOf(daily: Daily, metrics: string[], period: Period, end: string, historyStart: string): Window {
  const n = PERIOD_DAYS[period];
  const from = addDays(end, -(n - 1));
  const prevFrom = addDays(from, -n);
  const rows = new Map<string, Sums>();
  for (let day = from; day <= end; day = addDays(day, 1)) {
    const key = period === "12m" ? day.slice(0, 7) : day;
    const acc = rows.get(key) ?? Object.fromEntries(metrics.map((m) => [m, 0]));
    const row = daily.get(day);
    if (row) for (const m of metrics) acc[m] += row[m] ?? 0;
    rows.set(key, acc);
  }
  return {
    from,
    to: end,
    sums: sumRange(daily, metrics, from, end),
    previous: prevFrom >= historyStart ? sumRange(daily, metrics, prevFrom, addDays(from, -1)) : null,
    rows: [...rows].map(([date, sums]) => ({ date, sums })),
  };
}

/**
 * `{ metric: { value, previous, delta_pct } }` for a window. `derive` adds
 * numbers that cannot be summed per day (rates, net amounts).
 */
export function statsOf(w: Window, derive?: (sums: Sums) => Sums): Record<string, Stat> {
  const cur = { ...w.sums, ...derive?.(w.sums) };
  const prev = w.previous ? { ...w.previous, ...derive?.(w.previous) } : null;
  return Object.fromEntries(Object.keys(cur).map((k) => [k, stat(cur[k], prev ? prev[k] : null)]));
}

export async function eachPeriod(build: (period: Period) => unknown | Promise<unknown>): Promise<Record<Period, unknown>> {
  const out = {} as Record<Period, unknown>;
  for (const p of PERIODS) out[p] = await build(p);
  return out;
}

export function meta(ctx: Ctx, source: string, period: Period, extra: Record<string, unknown> = {}) {
  return { source, generated_at: ctx.now.toISOString(), range: period, ...extra };
}

/* ── Money ────────────────────────────────────────────────── */

// The dashboard formats money as amount / 100. These currencies have no minor
// unit at Stripe, so their amounts are scaled up to keep that rule true.
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
export const stripeMinor = (amount: number, currency: string) => (ZERO_DECIMAL.has(currency) ? amount * 100 : amount);

/** The configured currency, else the one with the most rows. */
export function primaryCurrency(configured: string | undefined, currencies: string[], fallback = "eur"): string {
  const wanted = configured?.trim().toLowerCase();
  if (wanted) return wanted;
  const count = new Map<string, number>();
  for (const c of currencies) count.set(c, (count.get(c) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

/* ── Template helpers ─────────────────────────────────────── */

type G = [x: number, y: number, w: number, h: number];
const grid = ([x, y, w, h]: G) => ({ x, y, w, h });
export const CUR: Format = { unit: "currency" };
export const PCT: Format = { unit: "percent", decimals: 1 };

/** Stat bound to `period.<metric>` (with its delta) or to any other path. */
export function tStat(id: string, title: string, src: string, path: string, g: G, format?: Format): Widget {
  const isPeriod = path.startsWith("period.");
  return {
    id,
    type: "stat",
    title,
    source_id: src,
    bindings: isPeriod ? { value: `${path}.value`, delta: `${path}.delta_pct` } : { value: path },
    ...(format ? { format: { value: format } } : {}),
    grid: grid(g),
  };
}

export const tSeries = (id: string, type: "bar" | "line", title: string, src: string, rows: string, y: string, g: G, format?: Format): Widget => ({
  id,
  type,
  title,
  source_id: src,
  bindings: { rows, x: "date", y },
  ...(format ? { format: { y: format } } : {}),
  grid: grid(g),
});

export const tItems = (id: string, type: "breakdown" | "funnel", title: string, src: string, rows: string, label: string, value: string, g: G): Widget => ({
  id,
  type,
  title,
  source_id: src,
  bindings: { rows, label, value },
  grid: grid(g),
});

export const tTable = (id: string, title: string, src: string, rows: string, columns: TableColumn[], g: G): Widget => ({
  id,
  type: "table",
  title,
  source_id: src,
  bindings: { rows },
  columns,
  grid: grid(g),
});
