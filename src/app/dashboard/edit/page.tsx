import { Suspense } from "react";
import { loadStore, toSourceInfo } from "@/lib/store";
import { parsePeriod } from "@/lib/types";
import { snapsForRange } from "@/lib/view";
import { EditCanvas } from "./_components/edit-canvas";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function DashboardEditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="p-6 text-[0.8125rem] text-outline font-mono">Loading editor…</div>}>
      <EditView searchParams={searchParams} />
    </Suspense>
  );
}

async function EditView({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const range = parsePeriod(sp.range);
  const { store } = await loadStore();
  const dashboard = store.dashboards.find((d) => d.id === sp.d) ?? store.dashboards[0];
  const page = dashboard.pages.find((p) => p.id === sp.page) ?? dashboard.pages[0];

  return (
    <EditCanvas
      // a different page is a different canvas: reset local state (rename field, open menus)
      key={`${dashboard.id}:${page.id}`}
      dashboardId={dashboard.id}
      dashboardName={dashboard.name}
      pages={dashboard.pages.map((p) => ({ id: p.id, name: p.name }))}
      page={page}
      range={range}
      sources={store.sources.filter((s) => s.dashboardId === dashboard.id).map(toSourceInfo)}
      snaps={snapsForRange(store, range)}
    />
  );
}
