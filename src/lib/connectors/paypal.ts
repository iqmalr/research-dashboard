import type { Period } from "../types";
import { CUR, FULL_HISTORY_DAYS, PCT, addDays, bump, call, dayKey, eachPeriod, meta, pct, primaryCurrency, statsOf, tSeries, tStat, tTable, windowOf, type Connector, type Ctx, type Daily } from "./core";

const CHUNK_DAYS = 31; // the Transaction Search API serves at most 31 days per request
const MAX_PAGES_PER_CHUNK = 20;

interface Amount {
  currency_code: string;
  value: string;
}
interface Tx {
  transaction_info: {
    transaction_event_code?: string;
    transaction_status?: string;
    transaction_initiation_date?: string;
    transaction_amount?: Amount;
    fee_amount?: Amount;
  };
}

const base = (ctx: Ctx) => (ctx.config.environment === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com");
const paypalError = (body: unknown) => {
  const b = body as { error_description?: string; message?: string; name?: string };
  return b.error_description ?? b.message ?? b.name;
};
/** PayPal sends decimal strings; the dashboard counts in the smallest unit. */
const minor = (a: Amount | undefined) => Math.round(Number(a?.value ?? 0) * 100);

const METRICS = ["gross", "fees", "refunds", "transactions", "refund_count"];

export const paypal: Connector = {
  hint: (c, config) => `${(config.clientId ?? "").slice(0, 4)}…${(config.clientId ?? "").slice(-4)} · ${config.environment || "live"}`,

  async fetchAll(ctx) {
    const basic = Buffer.from(`${ctx.config.clientId}:${ctx.credentials.clientSecret}`).toString("base64");
    const token = (await call(
      ctx,
      "PayPal",
      `${base(ctx)}/v1/oauth2/token`,
      { method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" },
      paypalError,
    )) as { access_token: string };

    const today = dayKey(ctx.now);
    const historyStart = addDays(today, -(FULL_HISTORY_DAYS - 1));
    const rows: { day: string; currency: string; code: string; amount: number; fee: number }[] = [];

    for (let from = historyStart; from <= today; from = addDays(from, CHUNK_DAYS)) {
      const last = addDays(from, CHUNK_DAYS - 1);
      const to = last < today ? last : today;
      for (let page = 1; page <= MAX_PAGES_PER_CHUNK; page++) {
        const q = new URLSearchParams({ start_date: `${from}T00:00:00Z`, end_date: `${to}T23:59:59Z`, fields: "transaction_info", page_size: "500", page: String(page) });
        const res = (await call(ctx, "PayPal", `${base(ctx)}/v1/reporting/transactions?${q}`, { headers: { Authorization: `Bearer ${token.access_token}` } }, paypalError)) as {
          transaction_details?: Tx[];
          total_pages?: number;
        };
        for (const { transaction_info: t } of res.transaction_details ?? []) {
          if (t.transaction_status !== "S" || !t.transaction_amount || !t.transaction_initiation_date) continue; // successful only
          rows.push({
            day: t.transaction_initiation_date.slice(0, 10),
            currency: t.transaction_amount.currency_code.toLowerCase(),
            code: t.transaction_event_code ?? "",
            amount: minor(t.transaction_amount),
            fee: Math.abs(minor(t.fee_amount)),
          });
        }
        if (page >= (res.total_pages ?? 1)) break;
      }
    }

    const currency = primaryCurrency(ctx.config.currency, rows.map((r) => r.currency));
    const daily: Daily = new Map();
    for (const r of rows) {
      if (r.currency !== currency) continue;
      // T00xx = payments received, T11xx = refunds and reversals
      if (r.code.startsWith("T00") && r.amount > 0) {
        bump(daily, r.day, "gross", r.amount);
        bump(daily, r.day, "fees", r.fee);
        bump(daily, r.day, "transactions", 1);
      } else if (r.code.startsWith("T11")) {
        bump(daily, r.day, "refunds", Math.abs(r.amount));
        bump(daily, r.day, "refund_count", 1);
      }
    }

    return eachPeriod((period: Period) => {
      const w = windowOf(daily, METRICS, period, today, historyStart);
      const net = (s: Record<string, number>) => s.gross - s.fees - s.refunds;
      const perCurrency = new Map<string, { currency: string; gross: number; transactions: number }>();
      for (const r of rows) {
        if (!r.code.startsWith("T00") || r.amount <= 0 || r.day < w.from || r.day > w.to) continue;
        const row = perCurrency.get(r.currency) ?? { currency: r.currency, gross: 0, transactions: 0 };
        row.gross += r.amount;
        row.transactions++;
        perCurrency.set(r.currency, row);
      }
      return {
        // PayPal's reporting can be up to 3 hours behind
        meta: meta(ctx, "paypal", period, { currency, data_through: new Date(ctx.now.getTime() - 3 * 3600_000).toISOString() }),
        period: statsOf(w, (s) => ({ net: net(s), fee_rate_pct: pct(s.fees, s.gross) })),
        series: { payments: w.rows.map(({ date, sums: r }) => ({ date, gross: r.gross, fees: r.fees, refunds: r.refunds, net: net(r), transactions: r.transactions })) },
        breakdowns: { gross_by_currency: [...perCurrency.values()].sort((a, b) => b.transactions - a.transactions) },
      };
    });
  },

  page: (src) => ({
    id: "paypal",
    name: "PayPal",
    widgets: [
      tStat("pp_gross", "Gross volume", src, "period.gross", [0, 0, 3, 1], CUR),
      tStat("pp_fees", "PayPal fees", src, "period.fees", [3, 0, 3, 1], CUR),
      tStat("pp_net", "Net", src, "period.net", [6, 0, 3, 1], CUR),
      tStat("pp_tx", "Payments", src, "period.transactions", [9, 0, 3, 1]),
      tSeries("pp_net_chart", "line", "Net revenue", src, "series.payments", "net", [0, 1, 8, 2], CUR),
      tTable(
        "pp_currency",
        "Volume by currency",
        src,
        "breakdowns.gross_by_currency",
        [
          { label: "Currency", field: "currency" },
          { label: "Payments", field: "transactions" },
          { label: "Gross (minor units)", field: "gross" },
        ],
        [8, 1, 4, 2],
      ),
      tStat("pp_refunds", "Refunds", src, "period.refunds", [0, 3, 3, 1], CUR),
      tStat("pp_refund_n", "Refund count", src, "period.refund_count", [3, 3, 3, 1]),
      tStat("pp_fee_rate", "Fee rate", src, "period.fee_rate_pct", [6, 3, 3, 1], PCT),
      tSeries("pp_tx_chart", "bar", "Payments", src, "series.payments", "transactions", [0, 4, 12, 2]),
    ],
  }),
};
