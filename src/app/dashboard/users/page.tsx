import { StatCard } from "@/components/stat-card";
import { WidgetCard } from "@/components/widget-card";
import { BarChart } from "@/components/bar-chart";

const kpis = [
  { title: "Total Users",     value: 1248, delta: 8.4,  description: "All-time registered accounts", source: "v2 users" },
  { title: "New (30d)",       value: 85,   delta: 12.1, description: "Signups this period",           source: "v2 users.signups" },
  { title: "Active (30d)",    value: 342,  delta: -2.3, description: "Any event in last 30 days",     source: "v2 users.activity" },
  { title: "Retention M+1",   value: 68.4, delta: 1.2,  description: "Retained after first month",   source: "v2 users.retention", suffix: "%" },
];

const signupsMonthly = [
  { label: "Dec", value: 42 }, { label: "Jan", value: 58 }, { label: "Feb", value: 51 },
  { label: "Mar", value: 67 }, { label: "Apr", value: 72 }, { label: "May", value: 63 },
  { label: "Jun", value: 78 }, { label: "Jul", value: 85 }, { label: "Aug", value: 71 },
  { label: "Sep", value: 92 }, { label: "Oct", value: 88 }, { label: "Nov", value: 85 },
];

const userTypes = [
  { label: "fan",      count: 702, pct: 58.3 },
  { label: "player",   count: 291, pct: 24.2 },
  { label: "agent",    count: 104, pct: 8.6  },
  { label: "club",     count: 71,  pct: 5.9  },
  { label: "investor", count: 36,  pct: 3.0  },
];

const roles = [
  { label: "free",  count: 820, pct: 65.7 },
  { label: "pro",   count: 268, pct: 21.5 },
  { label: "club",  count: 148, pct: 11.9 },
  { label: "elite", count: 12,  pct: 1.0  },
];

const retentionRows = [
  { cohort: "Jun 2026", size: 78, m1: 87, m2: 74, m3: 67 },
  { cohort: "Jul 2026", size: 85, m1: 87, m2: 72, m3: null },
  { cohort: "Aug 2026", size: 71, m1: 89, m2: null, m3: null },
  { cohort: "Sep 2026", size: 92, m1: 85, m2: null, m3: null },
  { cohort: "Oct 2026", size: 88, m1: 81, m2: null, m3: null },
  { cohort: "Nov 2026", size: 85, m1: null, m2: null, m3: null },
];

function retentionColor(pct: number) {
  if (pct >= 80) return "text-emerald-700 bg-emerald-50";
  if (pct >= 60) return "text-warn bg-amber-50";
  return "text-error bg-error-container";
}

const opacity = [1, 0.8, 0.6, 0.45, 0.3];

export default function UsersPage() {
  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <StatCard key={k.title} title={k.title} value={k.value} delta={k.delta}
            description={k.description} source={k.source} suffix={k.suffix} />
        ))}
      </div>

      {/* Signups chart + User type breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <WidgetCard title="Signups / month" meta="12 months" source="v2 users.signups" className="lg:col-span-8">
          <BarChart data={signupsMonthly} height={160} showAllLabels />
        </WidgetCard>

        <WidgetCard title="User type" source="v2 users.roles" className="lg:col-span-4">
          <div className="space-y-3.5 pt-1">
            {userTypes.map(({ label, count, pct }, i) => (
              <div key={label}>
                <div className="flex justify-between text-[0.8125rem] mb-1">
                  <span className="font-mono text-on-surface font-medium">{label}</span>
                  <span className="text-on-surface [font-variant-numeric:tabular-nums]">
                    <strong className="font-semibold">{count}</strong>{" "}
                    <span className="text-outline text-[11px]">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: `${pct}%`, opacity: opacity[i] ?? 0.25 }} />
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      {/* Role breakdown + Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <WidgetCard title="Subscription role" source="v2 users.roles" className="lg:col-span-4">
          <div className="space-y-3.5 pt-1">
            {roles.map(({ label, count, pct }, i) => (
              <div key={label}>
                <div className="flex justify-between text-[0.8125rem] mb-1">
                  <span className="font-mono text-on-surface font-medium">{label}</span>
                  <span className="text-on-surface [font-variant-numeric:tabular-nums]">
                    <strong className="font-semibold">{count}</strong>{" "}
                    <span className="text-outline text-[11px]">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: `${pct}%`, opacity: opacity[i] ?? 0.25 }} />
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Retention by cohort" source="v2 users.retention" className="lg:col-span-8">
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr className="border-b border-surface-container">
                <th className="text-left pb-2.5 font-semibold text-on-surface-variant pr-4">Cohort</th>
                <th className="text-right pb-2.5 font-semibold text-on-surface-variant pr-4">Size</th>
                <th className="text-center pb-2.5 font-semibold text-on-surface-variant pr-2">M+1</th>
                <th className="text-center pb-2.5 font-semibold text-on-surface-variant pr-2">M+2</th>
                <th className="text-center pb-2.5 font-semibold text-on-surface-variant">M+3</th>
              </tr>
            </thead>
            <tbody>
              {retentionRows.map((r) => (
                <tr key={r.cohort} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                  <td className="py-2 font-mono text-on-surface pr-4">{r.cohort}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-on-surface pr-4">{r.size}</td>
                  {[r.m1, r.m2, r.m3].map((v, i) => (
                    <td key={i} className="py-2 text-center pr-2">
                      {v !== null ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded font-semibold tabular-nums text-[11px] ${retentionColor(v)}`}>
                          {v}%
                        </span>
                      ) : (
                        <span className="text-outline-variant">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </WidgetCard>
      </div>
    </div>
  );
}
