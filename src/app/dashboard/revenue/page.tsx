import { StatCard } from "@/components/stat-card";
import { WidgetCard } from "@/components/widget-card";
import { BarChart } from "@/components/bar-chart";

const kpis = [
  { title: "MRR",        value: "€14,820", delta: 5.7,  description: "Monthly recurring revenue",  source: "stripe.billing_v2" },
  { title: "ARR",        value: "€177,840",delta: 5.7,  description: "Annualized run rate",         source: "stripe.billing_v2" },
  { title: "Revenue 30d",value: "€18,240", delta: 8.2,  description: "Total gross this period",     source: "stripe.revenue" },
  { title: "ARPU",       value: "€47.5",   delta: 2.1,  description: "Average revenue per user",    source: "stripe.revenue" },
];

const mrrMonthly = [
  { label: "Jun", value: 10200 }, { label: "Jul", value: 11450 }, { label: "Aug", value: 10900 },
  { label: "Sep", value: 12100 }, { label: "Oct", value: 13200 }, { label: "Nov", value: 14820 },
];

const planRows = [
  { label: "pro_monthly", count: 164, pct: 52.4 },
  { label: "pro_annual",  count: 104, pct: 33.2 },
  { label: "club",        count: 44,  pct: 14.1 },
];

const newVsChurn = [
  { label: "Jun", newSubs: 24, churn: 8  }, { label: "Jul", newSubs: 31, churn: 12 },
  { label: "Aug", newSubs: 22, churn: 15 }, { label: "Sep", newSubs: 38, churn: 11 },
  { label: "Oct", newSubs: 29, churn: 9  }, { label: "Nov", newSubs: 35, churn: 14 },
];

const topProducts = [
  { name: "Pro Monthly",     kind: "subscription", orders: 164, revenue: 4100  },
  { name: "Pro Annual",      kind: "subscription", orders: 104, revenue: 7280  },
  { name: "Club Plan",       kind: "subscription", orders: 44,  revenue: 3080  },
  { name: "AI Report",       kind: "one-time",     orders: 38,  revenue: 1140  },
  { name: "Credit Pack 100", kind: "one-time",     orders: 24,  revenue: 480   },
];

const opacity = [1, 0.75, 0.5];
const maxChurn = Math.max(...newVsChurn.flatMap((d) => [d.newSubs, d.churn]), 1);

export default function RevenuePage() {
  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <StatCard key={k.title} title={k.title} value={k.value} delta={k.delta}
            description={k.description} />
        ))}
      </div>

      {/* MRR trend + plan subscribers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <WidgetCard title="MRR trend" meta="6 months" className="lg:col-span-8">
          <BarChart data={mrrMonthly} height={160} showAllLabels />
        </WidgetCard>

        <WidgetCard title="Subscribers / plan" className="lg:col-span-4">
          <div className="space-y-3.5 pt-1">
            {planRows.map(({ label, count, pct }, i) => (
              <div key={label}>
                <div className="flex justify-between text-[0.8125rem] mb-1">
                  <span className="font-mono text-on-surface font-medium">{label}</span>
                  <span className="text-on-surface [font-variant-numeric:tabular-nums]">
                    <strong className="font-semibold">{count}</strong>{" "}
                    <span className="text-outline text-[11px]">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: `${pct}%`, opacity: opacity[i] }} />
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      {/* New vs Churn + Operational */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetCard title="New vs Churned / month">
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full bg-primary-container" />
              <span className="text-[0.75rem] text-on-surface-variant">New</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full bg-error" />
              <span className="text-[0.75rem] text-on-surface-variant">Churned</span>
            </div>
          </div>
          <div className="flex items-end gap-2" style={{ height: 128 }}>
            {newVsChurn.map((d, i) => (
              <div key={i} className="flex flex-col flex-1 items-center gap-1 h-full">
                <div className="flex items-end gap-0.5 w-full" style={{ height: "calc(100% - 20px)" }}>
                  <div className="flex-1 rounded-t-[2px] min-h-[2px] bg-primary-container"
                    style={{ height: `${(d.newSubs / maxChurn) * 100}%` }} />
                  <div className="flex-1 rounded-t-[2px] min-h-[2px] bg-error/60"
                    style={{ height: `${(d.churn / maxChurn) * 100}%` }} />
                </div>
                <span className="text-[9px] text-outline font-mono">{d.label}</span>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Operational">
          <div className="space-y-3">
            {[
              { label: "Upcoming churn", value: "23 subscriptions", detail: "€5,980 · end of period" },
              { label: "Past due",       value: "18 subscriptions", detail: "€4,320 at risk" },
              { label: "Refunds (30d)",  value: "4 orders",         detail: "€320 total · avg 2.1 days" },
            ].map((a, i) => (
              <div key={i} className="flex items-start justify-between gap-4 pb-3 border-b border-surface-container last:border-0 last:pb-0">
                <span className="text-[0.75rem] text-on-surface-variant">{a.label}</span>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[0.75rem] font-medium tabular-nums text-on-surface">{a.value}</div>
                  <div className="text-[11px] text-outline mt-0.5">{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      {/* Top products table */}
      <WidgetCard title="Top products — 30 days">
        <table className="w-full text-[0.75rem]">
          <thead>
            <tr className="border-b border-surface-container">
              <th className="text-left pb-2.5 font-semibold text-on-surface-variant pr-6">Product</th>
              <th className="text-left pb-2.5 font-semibold text-on-surface-variant pr-6">Type</th>
              <th className="text-right pb-2.5 font-semibold text-on-surface-variant pr-6">Orders</th>
              <th className="text-right pb-2.5 font-semibold text-on-surface-variant">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p) => (
              <tr key={p.name} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                <td className="py-2.5 font-medium text-on-surface pr-6">{p.name}</td>
                <td className="py-2.5 pr-6">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono text-[10px]">{p.kind}</span>
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums text-on-surface pr-6">{p.orders}</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-on-surface">€{p.revenue.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-surface-container">
              <td colSpan={2} className="pt-2.5 text-[0.75rem] font-medium text-on-surface-variant">Total</td>
              <td className="pt-2.5 text-right font-mono tabular-nums font-semibold text-on-surface pr-6">
                {topProducts.reduce((s, p) => s + p.orders, 0)}
              </td>
              <td className="pt-2.5 text-right font-mono tabular-nums font-semibold text-on-surface">
                €{topProducts.reduce((s, p) => s + p.revenue, 0).toLocaleString("en-US")}
              </td>
            </tr>
          </tfoot>
        </table>
      </WidgetCard>
    </div>
  );
}
