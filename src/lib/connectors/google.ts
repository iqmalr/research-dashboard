import { createSign } from "node:crypto";
import type { Period } from "../types";
import { PCT, PERIOD_DAYS, addDays, bump, call, dayKey, eachPeriod, meta, pct, round1, stat, statsOf, tItems, tSeries, tStat, tTable, windowOf, ConnectorError, type Connector, type Ctx, type Daily } from "./core";

/* ── Service account auth ─────────────────────────────────────
   No OAuth consent flow: the user shares the GA4 property / Search Console
   site with the service account's email, like with any other reader. */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const googleError = (body: unknown) => {
  const b = body as { error?: { message?: string } | string; error_description?: string };
  return typeof b.error === "string" ? (b.error_description ?? b.error) : b.error?.message;
};

function serviceAccount(ctx: Ctx): { client_email: string; private_key: string } {
  try {
    const sa = JSON.parse(ctx.credentials.serviceAccount ?? "");
    if (typeof sa.client_email === "string" && typeof sa.private_key === "string") return sa;
  } catch {}
  throw new ConnectorError("invalid", "The service account key is not the JSON file Google gave you (client_email and private_key are missing).");
}

async function accessToken(ctx: Ctx, scope: string): Promise<string> {
  if (ctx.demo) return "demo";
  const sa = serviceAccount(ctx);
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  // the audience is fixed here, not taken from the pasted file
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({ iss: sa.client_email, scope, aud: TOKEN_URL, iat: now, exp: now + 3600 })}`;
  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  } catch {
    throw new ConnectorError("invalid", "The private_key in the service account file could not be used to sign.");
  }
  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }).toString();
  const res = (await call(ctx, "Google", TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }, googleError)) as { access_token: string };
  return res.access_token;
}

function emailHint(c: Record<string, string>): string {
  try {
    return String(JSON.parse(c.serviceAccount).client_email ?? "service account");
  } catch {
    return "service account";
  }
}

const post = (ctx: Ctx, service: string, url: string, token: string, body: object) =>
  call(ctx, service, url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }, googleError);

/* ── Google Analytics 4 ───────────────────────────────────── */

interface GaRow {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}
interface GaReport {
  rows?: GaRow[];
}

// [our name, GA4 metric, is a 0..1 ratio]
const GA_TOTALS: [string, string, boolean][] = [
  ["users", "activeUsers", false],
  ["new_users", "newUsers", false],
  ["sessions", "sessions", false],
  ["page_views", "screenPageViews", false],
  ["engagement_rate_pct", "engagementRate", true],
  ["bounce_rate_pct", "bounceRate", true],
  ["avg_session_seconds", "averageSessionDuration", false],
];

const gaBreakdown = (dimension: string, metrics: string[], days: number) => ({
  dateRanges: [{ startDate: `${days - 1}daysAgo`, endDate: "today" }],
  dimensions: [{ name: dimension }],
  metrics: metrics.map((name) => ({ name })),
  orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
  limit: 10,
});

const gaRows = (report: GaReport | undefined, label: string, names: string[]) =>
  (report?.rows ?? []).map((r) => ({ [label]: r.dimensionValues?.[0]?.value ?? "", ...Object.fromEntries(names.map((n, i) => [n, Number(r.metricValues?.[i]?.value ?? 0)])) }));

export const ga4: Connector = {
  hint: (c, config) => `Property ${config.propertyId} · ${emailHint(c)}`,

  async fetchAll(ctx) {
    const property = (ctx.config.propertyId ?? "").replace(/^properties\//, "").trim();
    if (!/^\d+$/.test(property)) throw new ConnectorError("invalid", "The GA4 property ID is digits only, for example 382910443.");
    const token = await accessToken(ctx, "https://www.googleapis.com/auth/analytics.readonly");
    const api = `https://analyticsdata.googleapis.com/v1beta/properties/${property}`;

    // Chart rows: only metrics that can be added up per day (unique users cannot).
    const dailyReport = (await post(ctx, "Google Analytics", `${api}:runReport`, token, {
      dateRanges: [{ startDate: `${PERIOD_DAYS["12m"] - 1}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "screenPageViews" }, { name: "newUsers" }],
      limit: 1000,
    })) as GaReport;
    const daily: Daily = new Map();
    let last = "";
    for (const r of dailyReport.rows ?? []) {
      const d = r.dimensionValues?.[0]?.value ?? ""; // "20261123"
      const day = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      if (day > last) last = day;
      bump(daily, day, "sessions", Number(r.metricValues?.[0]?.value ?? 0));
      bump(daily, day, "page_views", Number(r.metricValues?.[1]?.value ?? 0));
      bump(daily, day, "new_users", Number(r.metricValues?.[2]?.value ?? 0));
    }
    const end = last || dayKey(ctx.now);

    return eachPeriod(async (period: Period) => {
      const n = PERIOD_DAYS[period];
      // Totals come straight from GA for this window and the one before it,
      // because users and rates cannot be derived from daily rows.
      const batch = (await post(ctx, "Google Analytics", `${api}:batchRunReports`, token, {
        requests: [
          {
            dateRanges: [
              { startDate: `${n - 1}daysAgo`, endDate: "today" },
              { startDate: `${2 * n - 1}daysAgo`, endDate: `${n}daysAgo` },
            ],
            metrics: GA_TOTALS.map(([, name]) => ({ name })),
          },
          gaBreakdown("pagePath", ["screenPageViews", "activeUsers"], n),
          gaBreakdown("country", ["activeUsers", "sessions"], n),
          gaBreakdown("deviceCategory", ["activeUsers", "sessions"], n),
          gaBreakdown("sessionDefaultChannelGroup", ["sessions", "activeUsers"], n),
        ],
      })) as { reports?: GaReport[] };
      const [totals, pages, countries, devices, channels] = batch.reports ?? [];

      // with two date ranges GA appends a "date_range_N" dimension to every row
      const rowOf = (range: string) => (totals?.rows ?? []).find((r) => (r.dimensionValues?.at(-1)?.value ?? "date_range_0") === range);
      const value = (row: GaRow | undefined, i: number, ratio: boolean) => {
        const v = Number(row?.metricValues?.[i]?.value ?? 0);
        return ratio ? round1(v * 100) : round1(v);
      };
      const cur = rowOf("date_range_0");
      const prev = rowOf("date_range_1");

      const w = windowOf(daily, ["sessions", "page_views", "new_users"], period, end, addDays(end, -(PERIOD_DAYS["12m"] - 1)));
      return {
        meta: meta(ctx, "ga4", period, { property, data_through: end }),
        period: Object.fromEntries(GA_TOTALS.map(([key, , ratio], i) => [key, stat(value(cur, i, ratio), prev ? value(prev, i, ratio) : null)])),
        series: { traffic: w.rows.map(({ date, sums: r }) => ({ date, sessions: r.sessions, page_views: r.page_views, new_users: r.new_users })) },
        breakdowns: {
          top_pages: gaRows(pages, "page", ["views", "users"]),
          countries: gaRows(countries, "country", ["users", "sessions"]),
          devices: gaRows(devices, "device", ["users", "sessions"]),
          channels: gaRows(channels, "channel", ["sessions", "users"]),
        },
      };
    });
  },

  page: (src) => ({
    id: "ga4",
    name: "Traffic",
    widgets: [
      tStat("ga_users", "Visitors", src, "period.users", [0, 0, 3, 1]),
      tStat("ga_sessions", "Sessions", src, "period.sessions", [3, 0, 3, 1]),
      tStat("ga_bounce", "Bounce rate", src, "period.bounce_rate_pct", [6, 0, 3, 1], PCT),
      tStat("ga_duration", "Avg. session (s)", src, "period.avg_session_seconds", [9, 0, 3, 1]),
      tSeries("ga_sessions_chart", "line", "Sessions", src, "series.traffic", "sessions", [0, 1, 8, 2]),
      tItems("ga_devices", "breakdown", "Devices", src, "breakdowns.devices", "device", "users", [8, 1, 4, 2]),
      tTable(
        "ga_pages",
        "Top pages",
        src,
        "breakdowns.top_pages",
        [
          { label: "Page", field: "page" },
          { label: "Views", field: "views" },
          { label: "Visitors", field: "users" },
        ],
        [0, 3, 6, 2],
      ),
      tItems("ga_channels", "breakdown", "Channels", src, "breakdowns.channels", "channel", "sessions", [6, 3, 3, 2]),
      tItems("ga_countries", "breakdown", "Countries", src, "breakdowns.countries", "country", "users", [9, 3, 3, 2]),
    ],
  }),
};

/* ── Search Console ───────────────────────────────────────── */

const GSC_HISTORY_DAYS = 480; // Search Console keeps 16 months

interface GscRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

export const gsc: Connector = {
  hint: (c, config) => `${config.siteUrl} · ${emailHint(c)}`,

  async fetchAll(ctx) {
    const site = (ctx.config.siteUrl ?? "").trim();
    if (!/^(sc-domain:[\w.-]+|https?:\/\/.+)$/.test(site)) throw new ConnectorError("invalid", "Use the property exactly as Search Console shows it: sc-domain:example.com or https://example.com/");
    const token = await accessToken(ctx, "https://www.googleapis.com/auth/webmasters.readonly");
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
    const query = async (body: object) => ((await post(ctx, "Search Console", url, token, body)) as { rows?: GscRow[] }).rows ?? [];

    const today = dayKey(ctx.now);
    const historyStart = addDays(today, -(GSC_HISTORY_DAYS - 1));
    const daily: Daily = new Map();
    let last = "";
    for (const r of await query({ startDate: historyStart, endDate: today, dimensions: ["date"], rowLimit: 25000 })) {
      const day = r.keys?.[0] ?? "";
      if (day > last) last = day;
      bump(daily, day, "clicks", r.clicks ?? 0);
      bump(daily, day, "impressions", r.impressions ?? 0);
      // weighted, so the period average can be recovered from the sums
      bump(daily, day, "position_weight", (r.position ?? 0) * (r.impressions ?? 0));
    }
    // Search Console is 2 to 3 days behind: periods end at the last day that has data.
    const end = last || addDays(today, -3);

    const top = (rows: GscRow[], label: string) =>
      rows.map((r) => ({ [label]: r.keys?.[0] ?? "", clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr_pct: round1((r.ctr ?? 0) * 100), position: round1(r.position ?? 0) }));

    return eachPeriod(async (period: Period) => {
      const w = windowOf(daily, ["clicks", "impressions", "position_weight"], period, end, historyStart);
      const range = { startDate: w.from, endDate: w.to, rowLimit: 10 };
      const stats = statsOf(w, (s) => ({ ctr_pct: pct(s.clicks, s.impressions), position: s.impressions > 0 ? round1(s.position_weight / s.impressions) : 0 }));
      delete stats.position_weight;
      return {
        meta: meta(ctx, "gsc", period, { site, data_through: end }),
        period: stats,
        series: { search: w.rows.map(({ date, sums: r }) => ({ date, clicks: r.clicks, impressions: r.impressions, position: r.impressions > 0 ? round1(r.position_weight / r.impressions) : 0 })) },
        breakdowns: {
          top_queries: top(await query({ ...range, dimensions: ["query"] }), "query"),
          top_pages: top(await query({ ...range, dimensions: ["page"] }), "page"),
        },
      };
    });
  },

  page: (src) => ({
    id: "gsc",
    name: "Search",
    widgets: [
      tStat("sc_clicks", "Search clicks", src, "period.clicks", [0, 0, 3, 1]),
      tStat("sc_impr", "Impressions", src, "period.impressions", [3, 0, 3, 1]),
      tStat("sc_ctr", "CTR", src, "period.ctr_pct", [6, 0, 3, 1], PCT),
      // no delta: a lower position is better, and the widget would colour it the wrong way
      { ...tStat("sc_pos", "Avg. position", src, "period.position", [9, 0, 3, 1]), bindings: { value: "period.position.value" } },
      tSeries("sc_clicks_chart", "line", "Search clicks", src, "series.search", "clicks", [0, 1, 12, 2]),
      tTable(
        "sc_queries",
        "Top queries",
        src,
        "breakdowns.top_queries",
        [
          { label: "Query", field: "query" },
          { label: "Clicks", field: "clicks" },
          { label: "Impressions", field: "impressions" },
          { label: "CTR", field: "ctr_pct", format: PCT },
          { label: "Position", field: "position" },
        ],
        [0, 3, 6, 2],
      ),
      tTable(
        "sc_pages",
        "Top pages",
        src,
        "breakdowns.top_pages",
        [
          { label: "Page", field: "page" },
          { label: "Clicks", field: "clicks" },
          { label: "Impressions", field: "impressions" },
          { label: "Position", field: "position" },
        ],
        [6, 3, 6, 2],
      ),
    ],
  }),
};
