import { Suspense } from "react";
import { loadStore, toSourceInfo } from "@/lib/store";
import { relTime } from "@/lib/time";
import { PERIODS, snapKey } from "@/lib/types";
import { SourcesClient, type SourceRow } from "./_components/sources-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function SourcesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="p-6 text-[0.8125rem] text-outline font-mono">Loading sources…</div>}>
      <SourcesView searchParams={searchParams} />
    </Suspense>
  );
}

async function SourcesView({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { store, now } = await loadStore();
  const widgets = store.dashboards.flatMap((d) => d.pages.flatMap((p) => p.widgets));
  const filter = store.dashboards.find((d) => d.id === sp.d)?.id ?? "";

  const rows: SourceRow[] = store.sources.map((s) => {
    const snaps = PERIODS.map((p) => store.snapshots[snapKey(s.id, p)]).filter(Boolean);
    const newest = snaps.map((x) => x.fetchedAt).sort().at(-1);
    return {
      ...toSourceInfo(s),
      dashboardName: store.dashboards.find((d) => d.id === s.dashboardId)?.name ?? "(deleted)",
      periods: snaps.length,
      widgets: widgets.filter((w) => w.source_id === s.id).length,
      lastSyncLabel: relTime(s.lastSyncAt, now),
      dataLabel: newest ? relTime(newest, now) : "no snapshot",
    };
  });

  return (
    <SourcesClient
      // the filter comes from the URL, so a different ?d= starts fresh
      key={`${filter}:${sp.add ?? ""}`}
      rows={rows}
      dashboards={store.dashboards.map((d) => ({ id: d.id, name: d.name }))}
      filter={filter}
      openAdd={sp.add === "1"}
      mockHint={process.env.ALLOW_MOCK_SOURCES === "true" ? (process.env.MOCK_SOURCE_BASE ?? "") : ""}
    />
  );
}
