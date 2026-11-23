import type { Period } from "../types";
import { FULL_HISTORY_DAYS, PCT, addDays, bump, call, dayKey, eachPeriod, meta, pct, statsOf, tItems, tSeries, tStat, windowOf, type Connector, type Daily } from "./core";

const CHUNK_DAYS = 30;

interface Report {
  date: string;
  requests?: number;
  delivered?: number;
  hardBounces?: number;
  softBounces?: number;
  uniqueClicks?: number;
  uniqueOpens?: number;
  spamReports?: number;
  blocked?: number;
  unsubscribed?: number;
}

const METRICS = ["sent", "delivered", "opens", "clicks", "bounces", "spam_reports", "blocked", "unsubscribed"];

export const brevo: Connector = {
  hint: (c) => `xkeysib-••••${(c.apiKey ?? "").slice(-4)}`,

  async fetchAll(ctx) {
    const today = dayKey(ctx.now);
    const historyStart = addDays(today, -(FULL_HISTORY_DAYS - 1));
    const daily: Daily = new Map();

    for (let from = historyStart; from <= today; from = addDays(from, CHUNK_DAYS)) {
      const last = addDays(from, CHUNK_DAYS - 1);
      const q = new URLSearchParams({ startDate: from, endDate: last < today ? last : today, limit: String(CHUNK_DAYS) });
      const res = (await call(ctx, "Brevo", `https://api.brevo.com/v3/smtp/statistics/reports?${q}`, { headers: { "api-key": ctx.credentials.apiKey } }, (b) => (b as { message?: string }).message)) as { reports?: Report[] };
      for (const r of res.reports ?? []) {
        bump(daily, r.date, "sent", r.requests ?? 0);
        bump(daily, r.date, "delivered", r.delivered ?? 0);
        bump(daily, r.date, "opens", r.uniqueOpens ?? 0);
        bump(daily, r.date, "clicks", r.uniqueClicks ?? 0);
        bump(daily, r.date, "bounces", (r.hardBounces ?? 0) + (r.softBounces ?? 0));
        bump(daily, r.date, "spam_reports", r.spamReports ?? 0);
        bump(daily, r.date, "blocked", r.blocked ?? 0);
        bump(daily, r.date, "unsubscribed", r.unsubscribed ?? 0);
      }
    }

    return eachPeriod((period: Period) => {
      const w = windowOf(daily, METRICS, period, today, historyStart);
      const s = w.sums;
      return {
        meta: meta(ctx, "brevo", period, { data_through: ctx.now.toISOString(), scope: "transactional email" }),
        period: statsOf(w, (x) => ({
          delivery_rate_pct: pct(x.delivered, x.sent),
          open_rate_pct: pct(x.opens, x.delivered),
          click_rate_pct: pct(x.clicks, x.delivered),
          bounce_rate_pct: pct(x.bounces, x.sent),
        })),
        series: { email: w.rows.map(({ date, sums: r }) => ({ date, sent: r.sent, delivered: r.delivered, opens: r.opens, clicks: r.clicks, bounces: r.bounces })) },
        breakdowns: {
          funnel: [
            { step: "Sent", count: s.sent },
            { step: "Delivered", count: s.delivered },
            { step: "Opened", count: s.opens },
            { step: "Clicked", count: s.clicks },
          ],
          problems: [
            { reason: "Bounced", count: s.bounces },
            { reason: "Blocked", count: s.blocked },
            { reason: "Spam reports", count: s.spam_reports },
            { reason: "Unsubscribed", count: s.unsubscribed },
          ],
        },
      };
    });
  },

  page: (src) => ({
    id: "brevo",
    name: "Email",
    widgets: [
      tStat("bv_sent", "Emails sent", src, "period.sent", [0, 0, 3, 1]),
      tStat("bv_delivery", "Delivery rate", src, "period.delivery_rate_pct", [3, 0, 3, 1], PCT),
      tStat("bv_open", "Open rate", src, "period.open_rate_pct", [6, 0, 3, 1], PCT),
      tStat("bv_click", "Click rate", src, "period.click_rate_pct", [9, 0, 3, 1], PCT),
      tSeries("bv_sent_chart", "bar", "Emails sent", src, "series.email", "sent", [0, 1, 8, 2]),
      tItems("bv_funnel", "funnel", "Sent to clicked", src, "breakdowns.funnel", "step", "count", [8, 1, 4, 2]),
      tSeries("bv_opens_chart", "line", "Opens", src, "series.email", "opens", [0, 3, 8, 2]),
      tItems("bv_problems", "breakdown", "Delivery problems", src, "breakdowns.problems", "reason", "count", [8, 3, 4, 2]),
    ],
  }),
};
