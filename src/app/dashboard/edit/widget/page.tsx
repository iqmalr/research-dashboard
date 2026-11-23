import { Suspense } from "react";
import Link from "next/link";
import { loadStore, toSourceInfo } from "@/lib/store";
import { shortDateTime } from "@/lib/time";
import { parsePeriod } from "@/lib/types";
import { snapsAllRanges } from "@/lib/view";
import { WidgetEditor } from "./_components/widget-editor";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function EditWidgetPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="p-6 text-[0.8125rem] text-outline font-mono">Loading widget…</div>}>
      <EditWidgetView searchParams={searchParams} />
    </Suspense>
  );
}

async function EditWidgetView({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const range = parsePeriod(sp.range);
  const { store } = await loadStore();
  const dashboard = store.dashboards.find((d) => d.id === sp.d) ?? store.dashboards[0];
  const page = dashboard.pages.find((p) => p.id === sp.page);
  const widget = page?.widgets.find((w) => w.id === sp.id);

  if (!page || !widget) {
    return (
      <div className="p-10 flex flex-col items-center gap-2 text-outline">
        <span className="material-symbols-outlined text-[28px]">search_off</span>
        <div className="text-[0.875rem] text-on-surface-variant font-medium">This widget no longer exists.</div>
        <Link href={`/dashboard/edit?d=${encodeURIComponent(dashboard.id)}`} className="text-[0.8125rem] text-primary font-semibold hover:underline">
          Back to the editor
        </Link>
      </div>
    );
  }

  const snaps = snapsAllRanges(store);
  // "Sample from 21 Nov 14:16 UTC", per source and period, formatted here so server and browser agree
  const fetchedLabels = Object.fromEntries(
    Object.entries(snaps).map(([p, map]) => [p, Object.fromEntries(Object.entries(map).map(([id, s]) => [id, s ? shortDateTime(s.fetchedAt) : ""]))]),
  );

  return (
    <WidgetEditor
      key={widget.id}
      dashboardId={dashboard.id}
      pageId={page.id}
      pageName={page.name}
      widget={widget}
      initialRange={range}
      sources={store.sources.filter((s) => s.dashboardId === dashboard.id).map(toSourceInfo)}
      snaps={snaps}
      fetchedLabels={fetchedLabels}
    />
  );
}
