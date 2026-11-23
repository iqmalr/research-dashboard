/**
 * Development fixtures. When a connector is saved with the credential "demo"
 * (and ALLOW_MOCK_SOURCES=true), its HTTP calls are answered from here in the
 * services' own response shapes, so the real aggregation code runs against
 * them. Numbers are generated, stable per day, and grow slowly over time.
 */

const DAY_MS = 86_400_000;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayStart = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), h | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1.0 two years ago, about 1.6 today */
const trend = (ms: number) => 1.6 - 0.6 * Math.min(1, (Date.now() - ms) / (730 * DAY_MS));

function* days(fromMs: number, toMs: number) {
  for (let t = dayStart(fromMs); t <= toMs; t += DAY_MS) yield t;
}

const ok = (body: unknown) => ({ status: 200, text: JSON.stringify(body) });

/* ── Stripe ───────────────────────────────────────────────── */

const PLANS = [
  { id: "price_pro_month", product: "prod_pro", unit_amount: 2900, interval: "month" },
  { id: "price_pro_year", product: "prod_pro", unit_amount: 29000, interval: "year" },
  { id: "price_club_month", product: "prod_club", unit_amount: 9900, interval: "month" },
];

function stripeTransactions(sinceSec: number) {
  const out: object[] = [];
  for (const t of days(sinceSec * 1000, Date.now())) {
    const r = rng(`stripe${dayKey(t)}`);
    const n = Math.floor((2 + r() * 4) * trend(t));
    for (let i = 0; i < n; i++) {
      const amount = [2900, 2900, 2900, 9900, 29000, 1900][Math.floor(r() * 6)];
      const created = Math.floor(t / 1000) + 3600 + i * 900;
      out.push({ id: `txn_${dayKey(t)}_${i}`, amount, fee: Math.round(amount * 0.015) + 25, currency: "eur", created, type: "charge", reporting_category: "charge" });
      if (r() < 0.03) out.push({ id: `txn_${dayKey(t)}_${i}r`, amount: -amount, fee: 0, currency: "eur", created: created + 60, type: "refund", reporting_category: "refund" });
    }
    if (new Date(t).getUTCDay() === 1) out.push({ id: `txn_${dayKey(t)}_po`, amount: -Math.round(60000 * trend(t)), fee: 0, currency: "eur", created: Math.floor(t / 1000) + 100, type: "payout", reporting_category: "payout" });
  }
  return out.reverse(); // newest first, like Stripe
}

function stripeSubscriptions() {
  const r = rng("stripe-subs");
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: 64 }, (_, i) => {
    const plan = PLANS[r() < 0.6 ? 0 : r() < 0.5 ? 1 : 2];
    const created = now - Math.floor(r() * r() * 500) * 86400;
    const roll = r();
    const status = roll < 0.72 ? "active" : roll < 0.8 ? "trialing" : roll < 0.84 ? "past_due" : "canceled";
    const canceled_at = status === "canceled" ? Math.min(now, created + Math.floor(20 + r() * 120) * 86400) : null;
    return {
      id: `sub_${i}`,
      status,
      created,
      canceled_at,
      ended_at: canceled_at,
      cancel_at_period_end: status === "active" && r() < 0.08,
      items: { data: [{ quantity: 1, price: { id: plan.id, nickname: null, unit_amount: plan.unit_amount, currency: "eur", product: plan.product, recurring: { interval: plan.interval, interval_count: 1 } } }] },
    };
  });
}

function stripe(u: URL) {
  if (u.pathname.endsWith("/balance_transactions")) {
    const all = stripeTransactions(Number(u.searchParams.get("created[gte]") ?? 0)) as { id: string }[];
    const after = u.searchParams.get("starting_after");
    const start = after ? all.findIndex((t) => t.id === after) + 1 : 0;
    return ok({ data: all.slice(start, start + 100), has_more: start + 100 < all.length });
  }
  if (u.pathname.endsWith("/subscriptions")) return ok({ data: stripeSubscriptions(), has_more: false });
  if (u.pathname.endsWith("/products"))
    return ok({
      data: [
        { id: "prod_pro", name: "Pro" },
        { id: "prod_club", name: "Club" },
      ],
      has_more: false,
    });
  return ok({ available: [{ amount: 152300, currency: "eur" }], pending: [{ amount: 48200, currency: "eur" }] });
}

/* ── PayPal ───────────────────────────────────────────────── */

function paypal(u: URL) {
  if (u.pathname.endsWith("/oauth2/token")) return ok({ access_token: "demo", expires_in: 3600 });
  const details: object[] = [];
  for (const t of days(Date.parse(u.searchParams.get("start_date") ?? ""), Math.min(Date.now(), Date.parse(u.searchParams.get("end_date") ?? "")))) {
    const r = rng(`paypal${dayKey(t)}`);
    const n = Math.floor((1 + r() * 2.5) * trend(t));
    for (let i = 0; i < n; i++) {
      const value = [29, 29, 99, 19][Math.floor(r() * 4)];
      const when = new Date(t + 7200_000 + i * 1800_000).toISOString();
      const tx = (code: string, amount: number, fee: number) => ({
        transaction_info: { transaction_event_code: code, transaction_status: "S", transaction_initiation_date: when, transaction_amount: { currency_code: "EUR", value: amount.toFixed(2) }, fee_amount: { currency_code: "EUR", value: fee.toFixed(2) } },
      });
      details.push(tx("T0006", value, -(value * 0.0349 + 0.39)));
      if (r() < 0.04) details.push(tx("T1107", -value, 0));
    }
  }
  return ok({ transaction_details: details, total_pages: 1, page: 1 });
}

/* ── Brevo ────────────────────────────────────────────────── */

function brevo(u: URL) {
  const reports: object[] = [];
  for (const t of days(Date.parse(u.searchParams.get("startDate") ?? ""), Math.min(Date.now(), Date.parse(u.searchParams.get("endDate") ?? "")))) {
    const r = rng(`brevo${dayKey(t)}`);
    const requests = Math.floor((60 + r() * 90) * trend(t));
    const delivered = Math.floor(requests * (0.96 + r() * 0.03));
    reports.push({
      date: dayKey(t),
      requests,
      delivered,
      hardBounces: Math.floor((requests - delivered) * 0.4),
      softBounces: Math.floor((requests - delivered) * 0.4),
      uniqueOpens: Math.floor(delivered * (0.38 + r() * 0.14)),
      uniqueClicks: Math.floor(delivered * (0.05 + r() * 0.06)),
      spamReports: r() < 0.05 ? 1 : 0,
      blocked: r() < 0.3 ? 1 : 0,
      unsubscribed: Math.floor(r() * 2.2),
    });
  }
  return ok({ reports });
}

/* ── Google ───────────────────────────────────────────────── */

interface GaRequest {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
}

const GA_DIMENSIONS: Record<string, [string, number][]> = {
  pagePath: [["/", 30], ["/players", 18], ["/compare", 12], ["/pricing", 9], ["/clubs", 8], ["/reports", 6], ["/blog/scouting-with-ai", 5], ["/signup", 5], ["/players/top-100", 4], ["/about", 3]],
  country: [["France", 26], ["Spain", 21], ["United Kingdom", 14], ["Germany", 11], ["Italy", 8], ["Netherlands", 6], ["Indonesia", 5], ["Portugal", 4], ["Belgium", 3], ["United States", 2]],
  deviceCategory: [["mobile", 58], ["desktop", 37], ["tablet", 5]],
  sessionDefaultChannelGroup: [["Organic Search", 46], ["Direct", 24], ["Organic Social", 13], ["Referral", 9], ["Paid Search", 5], ["Email", 3]],
};

const daysAgo = (s: string) => (s === "today" ? 0 : Number(/^(\d+)daysAgo$/.exec(s)?.[1] ?? 0));

function gaReport(req: GaRequest) {
  const dim = req.dimensions?.[0]?.name;
  if (dim === "date") {
    const rows = [];
    for (let ago = daysAgo(req.dateRanges[0].startDate); ago >= 0; ago--) {
      const t = dayStart(Date.now()) - ago * DAY_MS;
      const r = rng(`ga${dayKey(t)}`);
      const sessions = Math.floor((110 + r() * 80) * trend(t));
      rows.push({ dimensionValues: [{ value: dayKey(t).replaceAll("-", "") }], metricValues: [sessions, Math.floor(sessions * 2.7), Math.floor(sessions * 0.55)].map((v) => ({ value: String(v) })) });
    }
    return { rows };
  }
  const span = (range: { startDate: string; endDate: string }) => daysAgo(range.startDate) - daysAgo(range.endDate) + 1;
  if (!dim) {
    // totals: one row per date range
    const rows = req.dateRanges.map((range, i) => {
      const scale = span(range) * (i === 0 ? 1.55 : 1.4);
      const values: Record<string, number> = {
        activeUsers: Math.round(scale * 82),
        newUsers: Math.round(scale * 61),
        sessions: Math.round(scale * 118),
        screenPageViews: Math.round(scale * 320),
        engagementRate: i === 0 ? 0.631 : 0.604,
        bounceRate: i === 0 ? 0.369 : 0.396,
        averageSessionDuration: i === 0 ? 148.2 : 139.7,
      };
      return { dimensionValues: [{ value: `date_range_${i}` }], metricValues: req.metrics.map((m) => ({ value: String(values[m.name] ?? 0) })) };
    });
    return { rows };
  }
  const scale = span(req.dateRanges[0]) * 1.5;
  return {
    rows: (GA_DIMENSIONS[dim] ?? []).map(([label, share]) => ({
      dimensionValues: [{ value: label }],
      metricValues: req.metrics.map((_, i) => ({ value: String(Math.round((scale * share * (i === 0 ? 1.2 : 0.8)) / 1)) })),
    })),
  };
}

const GSC_QUERIES = ["football analytics", "ai scouting tool", "player comparison", "football data platform", "xg stats", "scouting report template", "compare football players", "football analytics ai", "transfer market analysis", "youth player stats"];
const GSC_PAGES = ["/", "/players", "/compare", "/blog/scouting-with-ai", "/pricing", "/clubs", "/players/top-100", "/reports", "/blog/what-is-xg", "/about"];

function gsc(body: { startDate: string; endDate: string; dimensions?: string[] }) {
  const from = Date.parse(body.startDate);
  const to = Math.min(Date.parse(body.endDate), dayStart(Date.now()) - 2 * DAY_MS); // Search Console lags
  const dim = body.dimensions?.[0];
  if (dim === "date") {
    const rows = [];
    for (const t of days(from, to)) {
      const r = rng(`gsc${dayKey(t)}`);
      const clicks = Math.floor((35 + r() * 30) * trend(t));
      const impressions = Math.floor(clicks * (22 + r() * 8));
      rows.push({ keys: [dayKey(t)], clicks, impressions, ctr: clicks / impressions, position: 16 - 4 * (trend(t) - 1) + r() * 2 });
    }
    return ok({ rows });
  }
  const span = Math.max(1, Math.round((to - from) / DAY_MS) + 1);
  const labels = dim === "page" ? GSC_PAGES.map((p) => `https://footballanalytics.example${p}`) : GSC_QUERIES;
  return ok({
    rows: labels.map((label, i) => {
      const clicks = Math.round((span * 14) / (i + 1.5));
      const impressions = Math.round(clicks * (14 + i * 3));
      return { keys: [label], clicks, impressions, ctr: clicks / impressions, position: 3.2 + i * 1.7 };
    }),
  });
}

/* ── Router ───────────────────────────────────────────────── */

export function demoResponse(url: string, body?: string): { status: number; text: string } {
  const u = new URL(url);
  if (u.hostname === "api.stripe.com") return stripe(u);
  if (u.hostname.endsWith("paypal.com")) return paypal(u);
  if (u.hostname === "api.brevo.com") return brevo(u);
  if (u.hostname === "analyticsdata.googleapis.com") {
    const parsed = JSON.parse(body ?? "{}");
    return ok(u.pathname.endsWith(":batchRunReports") ? { reports: (parsed.requests as GaRequest[]).map(gaReport) } : gaReport(parsed));
  }
  if (u.hostname === "www.googleapis.com") return gsc(JSON.parse(body ?? "{}"));
  return { status: 404, text: JSON.stringify({ error: { message: `No demo fixture for ${u.hostname}` } }) };
}
