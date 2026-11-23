import { StatCard } from "../../_components/stat-card";
import { WidgetCard } from "../../_components/widget-card";
import { BarChart } from "../../_components/bar-chart";

const kpis = [
  { title: "Sessions (30d)",    value: 18420, delta: 7.2,  description: "Total web sessions",         source: "analytics.sessions" },
  { title: "Page Views (30d)",  value: 52840, delta: 11.4, description: "Total page impressions",      source: "analytics.pageviews" },
  { title: "Signups (30d)",     value: 1840,  delta: 12.1, description: "New account registrations",   source: "v2 users.signups" },
  { title: "Paid conversions",  value: 420,   delta: 5.3,  description: "Checkout completed",          source: "stripe.payments" },
];

const fullFunnel = [
  { label: "Page view",         value: 52840 },
  { label: "Signup wall shown", value: 8320  },
  { label: "Signed up",         value: 1840  },
  { label: "Paywall shown",     value: 1240  },
  { label: "Checkout started",  value: 580   },
  { label: "Paid",              value: 420   },
];

const trafficSources = [
  { label: "google.com",    count: 7840, pct: 43.1 },
  { label: "(direct)",      count: 5210, pct: 28.6 },
  { label: "twitter.com",   count: 2140, pct: 11.8 },
  { label: "instagram.com", count: 1680, pct: 9.2  },
  { label: "other",         count: 1550, pct: 8.5  },
];

const topPages = [
  { path: "/",             views: 12450, signups: 320  },
  { path: "/players",      views: 8320,  signups: 210  },
  { path: "/compare",      views: 5840,  signups: 480  },
  { path: "/clubs",        views: 4120,  signups: 198  },
  { path: "/pricing",      views: 3690,  signups: 142  },
  { path: "/player/[id]",  views: 3240,  signups: 310  },
];

const compareClicks = [
  { label: "Mon", value: 284 }, { label: "Tue", value: 312 }, { label: "Wed", value: 298 },
  { label: "Thu", value: 342 }, { label: "Fri", value: 318 }, { label: "Sat", value: 198 },
  { label: "Sun", value: 172 },
];

const funnelMax = fullFunnel[0].value;
const opacity = [1, 0.85, 0.7, 0.55, 0.4, 0.3];

export default function FunnelPage() {
  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <StatCard key={k.title} title={k.title} value={k.value} delta={k.delta}
            description={k.description} source={k.source} />
        ))}
      </div>

      {/* Full funnel */}
      <WidgetCard title="Acquisition funnel — web" source="fastfoot.funnel">
        <div className="space-y-3">
          {fullFunnel.map(({ label, value }, i) => {
            const pct = (value / funnelMax) * 100;
            const stepPct = i > 0 ? ((value / fullFunnel[i - 1].value) * 100).toFixed(1) : null;
            return (
              <div key={i} className="flex items-center gap-4">
                <div className="w-36 text-[0.75rem] text-on-surface-variant shrink-0 text-right">{label}</div>
                <div className="flex-1 h-7 bg-surface-container rounded overflow-hidden relative">
                  <div className="h-full rounded bg-primary-container"
                    style={{ width: `${pct}%`, opacity: opacity[i] ?? 0.25 }} />
                </div>
                <div className="flex items-center gap-3 shrink-0 w-40">
                  <span className="font-mono font-semibold tabular-nums text-on-surface text-[0.875rem] w-16 text-right">
                    {value.toLocaleString("en-US")}
                  </span>
                  {stepPct !== null && (
                    <span className="text-[0.75rem] font-mono tabular-nums text-outline">{stepPct}% step</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-surface-container flex items-center gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-1">Abandoned checkout</div>
            <div className="text-[1.25rem] font-semibold font-mono tabular-nums text-error">160 <span className="text-[0.875rem] font-normal text-on-surface-variant">sessions</span></div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-1">Est. lost revenue</div>
            <div className="text-[1.25rem] font-semibold font-mono tabular-nums text-on-surface">€4,800</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-1">Abandon rate</div>
            <div className="text-[1.25rem] font-semibold font-mono tabular-nums text-warn">27.5%</div>
          </div>
        </div>
      </WidgetCard>

      {/* Traffic sources + Top pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetCard title="Traffic sources" source="analytics.sessions">
          <div className="space-y-3.5 pt-1">
            {trafficSources.map(({ label, count, pct }, i) => (
              <div key={label}>
                <div className="flex justify-between text-[0.8125rem] mb-1">
                  <span className="font-mono text-on-surface font-medium">{label}</span>
                  <span className="text-on-surface [font-variant-numeric:tabular-nums]">
                    <strong className="font-semibold">{count.toLocaleString("en-US")}</strong>{" "}
                    <span className="text-outline text-[11px]">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full"
                    style={{ width: `${pct}%`, opacity: 1 - i * 0.15 }} />
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Top pages" source="analytics.pageviews">
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr className="border-b border-surface-container">
                <th className="text-left pb-2.5 font-semibold text-on-surface-variant pr-4">Path</th>
                <th className="text-right pb-2.5 font-semibold text-on-surface-variant pr-4">Views</th>
                <th className="text-right pb-2.5 font-semibold text-on-surface-variant">Signups</th>
              </tr>
            </thead>
            <tbody>
              {topPages.map((p) => (
                <tr key={p.path} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                  <td className="py-2 font-mono text-on-surface pr-4">{p.path}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-on-surface pr-4">{p.views.toLocaleString("en-US")}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-primary-container font-medium">{p.signups.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </WidgetCard>
      </div>

      {/* Compare clicks */}
      <WidgetCard title="Compare clicks — last 7 days" source="analytics.events">
        <BarChart data={compareClicks} height={120} showAllLabels />
      </WidgetCard>
    </div>
  );
}
