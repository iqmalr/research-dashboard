import { shortDateTime } from "./time";
import { PERIODS, snapKey, type Period, type Store, type Widget } from "./types";

/** Snapshot as sent to the browser. */
export interface SnapLite {
  data: unknown;
  fetchedAt: string;
}

/** sourceId -> snapshot, for one period */
export type SnapMap = Record<string, SnapLite | undefined>;

export function snapsForRange(store: Store, range: Period): SnapMap {
  const out: SnapMap = {};
  for (const s of store.sources) {
    const snap = store.snapshots[snapKey(s.id, range)];
    if (snap) out[s.id] = { data: snap.data, fetchedAt: snap.fetchedAt };
  }
  return out;
}

export function snapsAllRanges(store: Store): Record<Period, SnapMap> {
  return Object.fromEntries(PERIODS.map((p) => [p, snapsForRange(store, p)])) as Record<Period, SnapMap>;
}

/** Everything <WidgetView> needs besides the widget itself. */
export function viewProps(widget: Widget, sources: { id: string; name: string; status: string }[], snaps: SnapMap) {
  const source = sources.find((s) => s.id === widget.source_id);
  const snap = snaps[widget.source_id];
  return {
    sourceName: source?.name,
    data: snap?.data,
    staleLabel: source?.status === "error" && snap ? `Data from ${shortDateTime(snap.fetchedAt)}` : undefined,
  };
}

export const gridStyle = (g: Widget["grid"]) => ({
  gridColumn: `${g.x + 1} / span ${g.w}`,
  gridRow: `${g.y + 1} / span ${g.h}`,
});

export const GRID_ROW = "minmax(132px, auto)";
