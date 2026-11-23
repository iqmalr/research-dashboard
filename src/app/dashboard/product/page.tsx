import { StatCard } from "@/components/stat-card";
import { WidgetCard } from "@/components/widget-card";

const kpis = [
  { title: "Active Features",    value: 8,     description: "Live feature flags enabled",     source: "features.flags" },
  { title: "Credits Burned",     value: 12480, delta: 14.2, description: "AI credits consumed 30d", source: "billing.credits" },
  { title: "Reports Generated",  value: 184,   delta: 22.1, description: "AI reports this period",  source: "reports.generated" },
  { title: "Clubs Active",       value: 44,    delta: 6.8,  description: "Clubs with any usage",     source: "v2 users.clubs" },
];

const featureUsage = [
  { label: "AI Scout",  value: 4820 }, { label: "Compare",   value: 3840 },
  { label: "Reports",   value: 2140 }, { label: "Watchlist", value: 1980 },
  { label: "Club Hub",  value: 1240 }, { label: "Pipeline",  value: 820  },
  { label: "Wellness",  value: 410  }, { label: "Academy",   value: 280  },
];

const creditsByFeature = [
  { label: "AI Scout", count: 7240, pct: 58.0 },
  { label: "Reports",  count: 3120, pct: 25.0 },
  { label: "Compare",  count: 1480, pct: 11.9 },
  { label: "Other",    count: 640,  pct: 5.1  },
];

const clubAdoption = [
  { feature: "Compare",      clubs: 44, pct: 100 },
  { feature: "Pipeline",     clubs: 38, pct: 86  },
  { feature: "Wellness",     clubs: 29, pct: 65  },
  { feature: "Academy",      clubs: 22, pct: 50  },
  { feature: "Negotiations", clubs: 18, pct: 40  },
  { feature: "Staff Tools",  clubs: 14, pct: 31  },
];

const reportsTable = [
  { type: "Player Report",  count: 84, avgSizeKb: 2400 },
  { type: "Club Report",    count: 48, avgSizeKb: 3800 },
  { type: "Comparison",     count: 32, avgSizeKb: 1200 },
  { type: "Scout Report",   count: 20, avgSizeKb: 4100 },
];

const featureMax = Math.max(...featureUsage.map((f) => f.value), 1);

function adoptionColor(pct: number) {
  if (pct >= 70) return "text-emerald-700";
  if (pct >= 40) return "text-warn";
  return "text-outline";
}

export default function ProductPage() {
  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <StatCard key={k.title} title={k.title} value={k.value} delta={k.delta}
            description={k.description} source={k.source} />
        ))}
      </div>

      {/* Feature usage + Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <WidgetCard title="Feature usage — events (30d)" source="analytics.events" className="lg:col-span-8">
          <div className="space-y-2.5">
            {featureUsage.map(({ label, value }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-20 text-[0.75rem] text-on-surface-variant shrink-0 text-right truncate">{label}</div>
                <div className="flex-1 h-5 bg-surface-container-low rounded overflow-hidden">
                  <div className="h-full rounded bg-primary-container"
                    style={{ width: `${(value / featureMax) * 100}%`, opacity: Math.max(1 - i * 0.1, 0.25) }} />
                </div>
                <div className="w-14 text-[0.75rem] font-mono tabular-nums text-on-surface text-right shrink-0">
                  {value.toLocaleString("en-US")}
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Credits / feature" source="billing.credits" className="lg:col-span-4">
          <div className="space-y-3.5 pt-1">
            {creditsByFeature.map(({ label, count, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-[0.8125rem] mb-1">
                  <span className="font-mono text-on-surface font-medium">{label}</span>
                  <span className="text-on-surface [font-variant-numeric:tabular-nums]">
                    <strong className="font-semibold">{count.toLocaleString("en-US")}</strong>{" "}
                    <span className="text-outline text-[11px]">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-surface-container grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-1">Avg / active user</div>
              <div className="text-[1.25rem] font-semibold font-mono tabular-nums text-on-surface">36.5</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-1">Near quota (80%)</div>
              <div className="text-[1.25rem] font-semibold font-mono tabular-nums text-warn">24</div>
              <div className="text-[11px] text-outline">accounts</div>
            </div>
          </div>
        </WidgetCard>
      </div>

      {/* Club adoption */}
      <WidgetCard title="Club feature adoption" source="v2 users.clubs">
        <div className="space-y-2.5">
          {clubAdoption.map(({ feature, clubs, pct }) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="w-28 text-[0.75rem] text-on-surface-variant shrink-0 truncate">{feature}</div>
              <div className="flex-1 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary-container" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[0.75rem] font-mono tabular-nums text-on-surface w-6 text-right">{clubs}</span>
                <span className={`text-[0.75rem] font-mono tabular-nums w-9 text-right ${adoptionColor(pct)}`}>{pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </WidgetCard>

      {/* Reports table */}
      <WidgetCard title="Reports generated — by type (30d)" source="reports.generated">
        <table className="w-full text-[0.75rem]">
          <thead>
            <tr className="border-b border-surface-container">
              <th className="text-left pb-2.5 font-semibold text-on-surface-variant pr-6">Type</th>
              <th className="text-right pb-2.5 font-semibold text-on-surface-variant pr-6">Count</th>
              <th className="text-right pb-2.5 font-semibold text-on-surface-variant">Avg size</th>
            </tr>
          </thead>
          <tbody>
            {reportsTable.map((r) => (
              <tr key={r.type} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                <td className="py-2.5 font-medium text-on-surface pr-6">{r.type}</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-on-surface pr-6">{r.count}</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-on-surface-variant">
                  {(r.avgSizeKb / 1024).toFixed(1)} MB
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-surface-container">
              <td className="pt-2.5 font-medium text-on-surface-variant pr-6">Total</td>
              <td className="pt-2.5 text-right font-mono tabular-nums font-semibold text-on-surface pr-6">
                {reportsTable.reduce((s, r) => s + r.count, 0)}
              </td>
              <td className="pt-2.5 text-right font-mono tabular-nums text-outline">
                {(reportsTable.reduce((s, r) => s + r.avgSizeKb, 0) / reportsTable.length / 1024).toFixed(1)} MB avg
              </td>
            </tr>
          </tfoot>
        </table>
      </WidgetCard>
    </div>
  );
}
