import type { Period } from "../types";
import {
  CUR,
  FULL_HISTORY_DAYS,
  PCT,
  addDays,
  bump,
  call,
  dayKey,
  eachPeriod,
  meta,
  optional,
  pct,
  primaryCurrency,
  statsOf,
  stripeMinor,
  tItems,
  tSeries,
  tStat,
  tTable,
  windowOf,
  type Connector,
  type Ctx,
  type Daily,
} from "./core";

const API = "https://api.stripe.com/v1";
const MAX_PAGES = 300; // 30,000 rows

/* The parts of Stripe's objects that are read here. */
interface BalanceTx {
  id: string;
  amount: number;
  fee: number;
  currency: string;
  created: number;
  type: string;
  reporting_category?: string;
}
interface Price {
  id: string;
  nickname: string | null;
  unit_amount: number | null;
  currency: string;
  product: string;
  recurring: { interval: "day" | "week" | "month" | "year"; interval_count: number } | null;
}
interface Subscription {
  id: string;
  status: string;
  created: number;
  canceled_at: number | null;
  ended_at: number | null;
  cancel_at_period_end: boolean;
  items: { data: { quantity?: number; price: Price }[] };
}
interface List<T> {
  data: T[];
  has_more: boolean;
}

const stripeError = (body: unknown) => (body as { error?: { message?: string } }).error?.message;

async function get<T>(ctx: Ctx, path: string, params: Record<string, string> = {}): Promise<T> {
  const q = new URLSearchParams(params).toString();
  return (await call(ctx, "Stripe", `${API}${path}${q ? `?${q}` : ""}`, { headers: { Authorization: `Bearer ${ctx.credentials.apiKey}` } }, stripeError)) as T;
}

/** Follows Stripe's cursor. Lists come newest first, so a cut-off loses the oldest rows. */
async function list<T extends { id: string }>(ctx: Ctx, path: string, params: Record<string, string>): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  let after: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await get<List<T>>(ctx, path, { limit: "100", ...params, ...(after ? { starting_after: after } : {}) });
    rows.push(...page.data);
    if (!page.has_more || page.data.length === 0) return { rows, truncated: false };
    after = page.data[page.data.length - 1].id;
  }
  return { rows, truncated: true };
}

const MONEY = ["gross", "fees", "refunds", "disputes", "payouts"] as const;
const COUNTS = ["charges", "refund_count", "dispute_count", "new_subscriptions", "churned_subscriptions"] as const;
const METRICS = [...MONEY, ...COUNTS];

/** Money moves by what it was, using Stripe's own reporting categories. */
function addTx(daily: Daily, day: string, t: BalanceTx, amount: number, fee: number) {
  switch (t.reporting_category ?? t.type) {
    case "charge":
    case "payment":
      bump(daily, day, "gross", amount);
      bump(daily, day, "fees", fee);
      bump(daily, day, "charges", 1);
      break;
    case "refund":
    case "payment_refund":
    case "partial_capture_reversal":
      bump(daily, day, "refunds", -amount);
      bump(daily, day, "fees", fee);
      bump(daily, day, "refund_count", 1);
      break;
    case "dispute":
      bump(daily, day, "disputes", -amount);
      bump(daily, day, "fees", fee);
      bump(daily, day, "dispute_count", 1);
      break;
    case "dispute_reversal":
      bump(daily, day, "disputes", -amount);
      break;
    case "payout":
      bump(daily, day, "payouts", -amount);
      break;
    case "fee":
    case "stripe_fee":
    case "network_cost":
      bump(daily, day, "fees", -amount);
      break;
  }
}

const PER_MONTH = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 };

function monthly(price: Price, quantity: number, currency: string): number {
  if (!price.recurring || price.unit_amount === null) return 0; // tiered and metered prices have no fixed amount
  const perInterval = stripeMinor(price.unit_amount, currency) * quantity;
  return Math.round((perInterval * PER_MONTH[price.recurring.interval]) / (price.recurring.interval_count || 1));
}

export const stripe: Connector = {
  hint(c) {
    const key = c.apiKey ?? "";
    const prefix = /^[a-z]+_[a-z]+_/.exec(key)?.[0] ?? "";
    return key.length > 8 ? `${prefix}••••${key.slice(-4)}` : "••••";
  },

  async fetchAll(ctx) {
    const today = dayKey(ctx.now);
    let historyStart = addDays(today, -(FULL_HISTORY_DAYS - 1));
    const since = String(Math.floor(Date.parse(`${historyStart}T00:00:00Z`) / 1000));
    const warnings: string[] = [];

    const txs = await list<BalanceTx>(ctx, "/balance_transactions", { "created[gte]": since });
    if (txs.truncated) {
      historyStart = dayKey(txs.rows[txs.rows.length - 1].created * 1000);
      warnings.push(`Only the newest ${txs.rows.length} balance transactions were read, back to ${historyStart}. Longer periods are incomplete.`);
    }
    const subs = await optional(warnings, "Subscriptions", () => list<Subscription>(ctx, "/subscriptions", { status: "all" }));
    const products = await optional(warnings, "Product names", () => get<List<{ id: string; name: string }>>(ctx, "/products", { limit: "100" }));
    const balance = await optional(warnings, "Balance", () => get<{ available: { amount: number; currency: string }[]; pending: { amount: number; currency: string }[] }>(ctx, "/balance"));

    const currency = primaryCurrency(ctx.config.currency, [...txs.rows.map((t) => t.currency), ...(subs?.rows ?? []).flatMap((s) => s.items.data.map((i) => i.price.currency))]);

    const daily: Daily = new Map();
    for (const t of txs.rows) {
      if (t.currency !== currency) continue;
      addTx(daily, dayKey(t.created * 1000), t, stripeMinor(t.amount, currency), stripeMinor(t.fee, currency));
    }

    // Subscriptions: current state for the totals, created / ended dates for the period.
    const byStatus = new Map<string, number>();
    const byPlan = new Map<string, { plan: string; interval: string; subscribers: number; mrr: number }>();
    const productName = new Map((products?.data ?? []).map((p) => [p.id, p.name]));
    let mrr = 0;
    let cancelAtPeriodEnd = 0;
    for (const s of subs?.rows ?? []) {
      byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
      bump(daily, dayKey(s.created * 1000), "new_subscriptions", 1);
      const ended = s.ended_at ?? (s.status === "canceled" ? s.canceled_at : null);
      if (ended) bump(daily, dayKey(ended * 1000), "churned_subscriptions", 1);
      if (s.status !== "active" && s.status !== "past_due") continue;
      if (s.cancel_at_period_end) cancelAtPeriodEnd++;
      for (const item of s.items.data) {
        if (item.price.currency !== currency) continue;
        const amount = monthly(item.price, item.quantity ?? 1, currency);
        mrr += amount;
        const row = byPlan.get(item.price.id) ?? {
          plan: item.price.nickname || productName.get(item.price.product) || item.price.id,
          interval: item.price.recurring?.interval ?? "one-off",
          subscribers: 0,
          mrr: 0,
        };
        row.subscribers++;
        row.mrr += amount;
        byPlan.set(item.price.id, row);
      }
    }

    const money = (list: { amount: number; currency: string }[] | undefined) => stripeMinor(list?.find((b) => b.currency === currency)?.amount ?? 0, currency);
    const totals = {
      mrr,
      arr: mrr * 12,
      active_subscriptions: byStatus.get("active") ?? 0,
      trialing: byStatus.get("trialing") ?? 0,
      past_due: byStatus.get("past_due") ?? 0,
      cancel_at_period_end: cancelAtPeriodEnd,
      balance_available: money(balance?.available),
      balance_pending: money(balance?.pending),
    };

    return eachPeriod((period: Period) => {
      const w = windowOf(daily, METRICS, period, today, historyStart);
      const net = (s: Record<string, number>) => s.gross - s.fees - s.refunds - s.disputes;

      // other currencies are not summed in, only listed
      const perCurrency = new Map<string, { currency: string; gross: number; charges: number }>();
      for (const t of txs.rows) {
        const cat = t.reporting_category ?? t.type;
        const day = dayKey(t.created * 1000);
        if ((cat !== "charge" && cat !== "payment") || day < w.from || day > w.to) continue;
        const row = perCurrency.get(t.currency) ?? { currency: t.currency, gross: 0, charges: 0 };
        row.gross += stripeMinor(t.amount, t.currency);
        row.charges++;
        perCurrency.set(t.currency, row);
      }

      return {
        meta: meta(ctx, "stripe", period, { currency, data_through: ctx.now.toISOString(), truncated: txs.truncated, warnings }),
        totals,
        period: statsOf(w, (s) => ({ net: net(s), fee_rate_pct: pct(s.fees, s.gross) })),
        series: {
          revenue: w.rows.map(({ date, sums: r }) => ({ date, gross: r.gross, fees: r.fees, refunds: r.refunds, net: net(r) })),
          subscriptions: w.rows.map(({ date, sums: r }) => ({ date, new: r.new_subscriptions, churned: r.churned_subscriptions })),
        },
        breakdowns: {
          subscriptions_by_status: [...byStatus].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
          mrr_by_plan: [...byPlan.values()].sort((a, b) => b.mrr - a.mrr),
          gross_by_currency: [...perCurrency.values()].sort((a, b) => b.charges - a.charges),
        },
      };
    });
  },

  page: (src) => ({
    id: "stripe",
    name: "Stripe",
    widgets: [
      tStat("st_gross", "Gross volume", src, "period.gross", [0, 0, 3, 1], CUR),
      tStat("st_fees", "Stripe fees", src, "period.fees", [3, 0, 3, 1], CUR),
      tStat("st_net", "Net", src, "period.net", [6, 0, 3, 1], CUR),
      tStat("st_mrr", "MRR", src, "totals.mrr", [9, 0, 3, 1], CUR),
      tSeries("st_net_chart", "line", "Net revenue", src, "series.revenue", "net", [0, 1, 8, 2], CUR),
      tItems("st_status", "breakdown", "Subscription status", src, "breakdowns.subscriptions_by_status", "status", "count", [8, 1, 4, 2]),
      tTable(
        "st_plans",
        "MRR by plan",
        src,
        "breakdowns.mrr_by_plan",
        [
          { label: "Plan", field: "plan" },
          { label: "Interval", field: "interval" },
          { label: "Subscribers", field: "subscribers" },
          { label: "MRR", field: "mrr", format: CUR },
        ],
        [0, 3, 6, 2],
      ),
      tSeries("st_new_subs", "bar", "New subscriptions", src, "series.subscriptions", "new", [6, 3, 6, 2]),
      tStat("st_refunds", "Refunds", src, "period.refunds", [0, 5, 3, 1], CUR),
      tStat("st_fee_rate", "Fee rate", src, "period.fee_rate_pct", [3, 5, 3, 1], PCT),
      tStat("st_disputes", "Disputes", src, "period.dispute_count", [6, 5, 3, 1]),
      tStat("st_past_due", "Past due", src, "totals.past_due", [9, 5, 3, 1]),
    ],
  }),
};
