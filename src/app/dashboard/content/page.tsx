import { StatCard } from "@/components/stat-card";
import { WidgetCard } from "@/components/widget-card";
import { BarChart } from "@/components/bar-chart";

const kpis = [
  { title: "Total Pages",    value: 284,   delta: 4.2,  description: "All CMS pages",           source: "cms.pages" },
  { title: "Published",      value: "72.5%",delta: 2.1, description: "Percentage live",          source: "cms.pages" },
  { title: "Catalog Items",  value: 48240, delta: 0.8,  description: "Indexed content records",  source: "catalog.items" },
  { title: "Redirects",      value: 142,   delta: -1.4, description: "Active redirect rules",    source: "cms.redirects" },
];

const pagesByStatus = [
  { label: "Published", count: 206, pct: 72.5 },
  { label: "Draft",     count: 54,  pct: 19.0 },
  { label: "Archived",  count: 24,  pct: 8.5  },
];

const editorActivity = [
  { label: "Mon", value: 18 }, { label: "Tue", value: 24 }, { label: "Wed", value: 31 },
  { label: "Thu", value: 22 }, { label: "Fri", value: 28 }, { label: "Sat", value: 8  },
  { label: "Sun", value: 4  },
];

const translationGaps = [
  { slug: "pricing",           hasFr: false, hasEs: true  },
  { slug: "features",          hasFr: true,  hasEs: false },
  { slug: "about",             hasFr: false, hasEs: false },
  { slug: "blog/top-players",  hasFr: false, hasEs: false },
  { slug: "contact",           hasFr: true,  hasEs: false },
  { slug: "terms",             hasFr: false, hasEs: false },
];

const catalogs = [
  { name: "Players",   items: 32840, visible: 28420, synced: "12 min ago", healthy: true  },
  { name: "Clubs",     items: 14200, visible: 12800, synced: "14 min ago", healthy: true  },
  { name: "Transfers", items: 1200,  visible: 1180,  synced: "2 days ago", healthy: false },
];

const statusOpacity = [1, 0.6, 0.3];
const missingFr = translationGaps.filter((g) => !g.hasFr).length;
const missingEs = translationGaps.filter((g) => !g.hasEs).length;

export default function ContentPage() {
  return (
    <div className="space-y-4 max-w-350">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <StatCard key={k.title} title={k.title} value={k.value} delta={k.delta}
            description={k.description}/>
        ))}
      </div>

      {/* Page status + Editor activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <WidgetCard title="Pages by status" className="lg:col-span-4">
          <div className="space-y-3.5 pt-1">
            {pagesByStatus.map(({ label, count, pct }, i) => (
              <div key={label}>
                <div className="flex justify-between text-[0.8125rem] mb-1">
                  <span className="font-mono text-on-surface font-medium">{label.toLowerCase()}</span>
                  <span className="text-on-surface [font-variant-numeric:tabular-nums]">
                    <strong className="font-semibold">{count}</strong>{" "}
                    <span className="text-outline text-[11px]">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full"
                    style={{ width: `${pct}%`, opacity: statusOpacity[i] }} />
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Editor activity — changes / day (7d)" className="lg:col-span-8">
          <BarChart data={editorActivity} height={120} showAllLabels />
        </WidgetCard>
      </div>

      {/* Translation gaps + Catalog health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetCard title="Translation gaps — EN slugs missing in other locales">
          <div className="flex gap-6 mb-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-1">Missing FR</div>
              <div className="text-[1.5rem] font-semibold font-mono tabular-nums text-warn">{missingFr}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-1">Missing ES</div>
              <div className="text-[1.5rem] font-semibold font-mono tabular-nums text-warn">{missingEs}</div>
            </div>
          </div>
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr className="border-b border-surface-container">
                <th className="text-left pb-2.5 font-semibold text-on-surface-variant pr-6">Slug (EN)</th>
                <th className="text-center pb-2.5 font-semibold text-on-surface-variant pr-4 w-12">FR</th>
                <th className="text-center pb-2.5 font-semibold text-on-surface-variant w-12">ES</th>
              </tr>
            </thead>
            <tbody>
              {translationGaps.map((g) => (
                <tr key={g.slug} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                  <td className="py-2 font-mono text-on-surface pr-6">{g.slug}</td>
                  <td className="py-2 text-center pr-4">
                    {g.hasFr
                      ? <span className="text-emerald-600 font-semibold">✓</span>
                      : <span className="text-error font-semibold">—</span>}
                  </td>
                  <td className="py-2 text-center">
                    {g.hasEs
                      ? <span className="text-emerald-600 font-semibold">✓</span>
                      : <span className="text-error font-semibold">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </WidgetCard>

        <WidgetCard title="Catalog health">
          <table className="w-full text-[0.75rem]">
            <thead>
              <tr className="border-b border-surface-container">
                <th className="text-left pb-2.5 font-semibold text-on-surface-variant pr-4">Catalog</th>
                <th className="text-right pb-2.5 font-semibold text-on-surface-variant pr-4">Items</th>
                <th className="text-right pb-2.5 font-semibold text-on-surface-variant pr-4">Visible</th>
                <th className="text-right pb-2.5 font-semibold text-on-surface-variant">Last sync</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.map((c) => (
                <tr key={c.name} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                  <td className="py-2.5 font-medium text-on-surface pr-4">{c.name}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-on-surface pr-4">{c.items.toLocaleString("en-US")}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-on-surface pr-4">{c.visible.toLocaleString("en-US")}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.healthy ? "bg-emerald-500" : "bg-error"}`} />
                      <span className={`text-[11px] font-mono ${c.healthy ? "text-outline" : "text-error"}`}>{c.synced}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {catalogs.some((c) => !c.healthy) && (
            <div className="mt-4 rounded-md p-3 bg-error-container/40 border border-error/20">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-error shrink-0 mt-0.5">warning</span>
                <div>
                  <div className="text-[0.75rem] font-semibold text-error">Transfers catalog stale</div>
                  <div className="text-[11px] mt-0.5 text-on-surface-variant">
                    Last synced 2 days ago — player transfer data may be out of date
                  </div>
                </div>
              </div>
            </div>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}
