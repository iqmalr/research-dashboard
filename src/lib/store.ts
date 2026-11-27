import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { seal } from "./secrets";
import { SEED_SOURCES, TEMPLATE_PAGES } from "./templates";
import { snapKey, type Period, type Snapshot, type Source, type SourceInfo, type Store, type SyncRun, type Widget } from "./types";

const MAX_RUNS = 300;

const hintOf = (key: string) => (key ? `••••${key.slice(-4)}` : "");

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key, { auth: { persistSession: false } });
}

function seed(): Store {
  const base = (process.env.MOCK_SOURCE_BASE ?? "http://localhost:4000/api/mock/v2/stats").replace(/\/$/, "");
  const now = new Date().toISOString();
  return {
    version: 3,
    dashboards: [
      {
        id: "football",
        name: "Football Analytics AI",
        description: "Users, revenue and content for Football Analytics AI v2",
        pages: structuredClone(TEMPLATE_PAGES),
      },
    ],
    sources: SEED_SOURCES.map((s) => ({
      id: s.id,
      dashboardId: "football",
      kind: "endpoint" as const,
      name: s.name,
      url: base + s.path,
      secret: seal({ apiKey: process.env.MOCK_API_KEY ?? "" }),
      keyHint: hintOf(process.env.MOCK_API_KEY ?? ""),
      config: {},
      status: "never" as const,
      createdAt: now,
    })),
    snapshots: {},
    runs: [],
  };
}

type Row = Record<string, unknown>;
const TABLES = ["rd_dashboards", "rd_pages", "rd_sources", "rd_widgets", "rd_snapshots", "rd_sync_runs"] as const;
type Table = (typeof TABLES)[number];
type Rows = Record<Table, Row[]>;

const KEYS: Record<Table, string[]> = {
  rd_dashboards: ["id"],
  rd_pages: ["id"],
  rd_sources: ["id"],
  rd_widgets: ["id"],
  rd_snapshots: ["source_id", "period"],
  rd_sync_runs: ["id"],
};
const keyOf = (t: Table, r: Row) => KEYS[t].map((k) => r[k]).join("|");
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : undefined);

function toRows(s: Store): Rows {
  const rows: Rows = { rd_dashboards: [], rd_pages: [], rd_sources: [], rd_widgets: [], rd_snapshots: [], rd_sync_runs: [] };
  s.dashboards.forEach((d, i) => {
    rows.rd_dashboards.push({ id: d.id, name: d.name, description: d.description, position: i });
    d.pages.forEach((p, pi) => {
      rows.rd_pages.push({ id: p.id, dashboard_id: d.id, name: p.name, position: pi });
      p.widgets.forEach((w, wi) =>
        rows.rd_widgets.push({
          id: w.id, page_id: p.id, type: w.type, title: w.title, source_id: w.source_id,
          bindings: w.bindings, columns: w.columns ?? null, table_options: w.tableOptions ?? null, format: w.format ?? null,
          grid_x: w.grid.x, grid_y: w.grid.y, grid_w: w.grid.w, grid_h: w.grid.h, position: wi,
        }),
      );
    });
  });
  s.sources.forEach((x, i) =>
    rows.rd_sources.push({
      id: x.id, dashboard_id: x.dashboardId, kind: x.kind, name: x.name, url: x.url, secret: x.secret, key_hint: x.keyHint,
      config: x.config, status: x.status, last_error: x.lastError ?? null, last_sync_at: x.lastSyncAt ?? null, created_at: x.createdAt, position: i,
    }),
  );
  for (const n of Object.values(s.snapshots))
    rows.rd_snapshots.push({ source_id: n.sourceId, period: n.period, fetched_at: n.fetchedAt, bytes: n.bytes, data: n.data });
  for (const r of s.runs.slice(0, MAX_RUNS))
    rows.rd_sync_runs.push({
      id: r.id, source_id: r.sourceId, source_name: r.sourceName, period: r.period, status: r.status,
      http_status: r.httpStatus ?? null, duration_ms: r.durationMs, bytes: r.bytes, error: r.error ?? null, at: r.at,
    });
  return rows;
}

function fromRows(r: Rows): Store {
  const widgetsOf = (pageId: string): Widget[] =>
    r.rd_widgets.filter((w) => w.page_id === pageId).map((w) => ({
      id: w.id as string, type: w.type as Widget["type"], title: w.title as string, source_id: w.source_id as string,
      bindings: w.bindings as Widget["bindings"],
      ...(w.columns ? { columns: w.columns as Widget["columns"] } : {}),
      ...(w.table_options ? { tableOptions: w.table_options as Widget["tableOptions"] } : {}),
      ...(w.format ? { format: w.format as Widget["format"] } : {}),
      grid: { x: w.grid_x as number, y: w.grid_y as number, w: w.grid_w as number, h: w.grid_h as number },
    }));
  const snapshots: Store["snapshots"] = {};
  for (const n of r.rd_snapshots) {
    const snap: Snapshot = { sourceId: n.source_id as string, period: n.period as Period, fetchedAt: iso(n.fetched_at)!, bytes: n.bytes as number, data: n.data };
    snapshots[snapKey(snap.sourceId, snap.period)] = snap;
  }
  return {
    version: 3,
    dashboards: r.rd_dashboards.map((d) => ({
      id: d.id as string, name: d.name as string, description: d.description as string,
      pages: r.rd_pages.filter((p) => p.dashboard_id === d.id).map((p) => ({ id: p.id as string, name: p.name as string, widgets: widgetsOf(p.id as string) })),
    })),
    sources: r.rd_sources.map((x) => ({
      id: x.id as string, dashboardId: x.dashboard_id as string, kind: x.kind as Source["kind"], name: x.name as string, url: x.url as string,
      secret: x.secret as string, keyHint: x.key_hint as string, config: x.config as Source["config"], status: x.status as Source["status"],
      ...(x.last_error ? { lastError: x.last_error as Source["lastError"] } : {}),
      ...(x.last_sync_at ? { lastSyncAt: iso(x.last_sync_at) } : {}),
      createdAt: iso(x.created_at)!,
    })),
    snapshots,
    runs: r.rd_sync_runs.map((x) => ({
      id: x.id as string, sourceId: x.source_id as string, sourceName: x.source_name as string, period: x.period as Period,
      status: x.status as SyncRun["status"],
      ...(x.http_status != null ? { httpStatus: x.http_status as number } : {}),
      durationMs: x.duration_ms as number, bytes: x.bytes as number,
      ...(x.error ? { error: x.error as string } : {}),
      at: iso(x.at)!,
    })),
  };
}

async function readRows(): Promise<Rows> {
  const c = db();
  const q = (t: Table) => {
    const b = c.from(t).select("*");
    return t === "rd_sync_runs" ? b.order("at", { ascending: false }) : t === "rd_snapshots" ? b : b.order("position");
  };
  const res = await Promise.all(TABLES.map((t) => q(t)));
  const rows = {} as Rows;
  res.forEach((x, i) => {
    if (x.error) throw new Error(`Store read failed (${TABLES[i]}): ${x.error.message}`);
    rows[TABLES[i]] = x.data as Row[];
  });
  return rows;
}

// Writes only rows that differ from `before`; deletes rows that disappeared. Parents first (FK order).
async function write(before: Rows, store: Store) {
  const after = toRows(store);
  const c = db();
  for (const t of TABLES) {
    const old = new Map(before[t].map((r) => [keyOf(t, r), JSON.stringify(r)]));
    const changed = after[t].filter((r) => old.get(keyOf(t, r)) !== JSON.stringify(r));
    if (changed.length) {
      const { error } = await c.from(t).upsert(changed, { onConflict: KEYS[t].join(",") });
      if (error) throw new Error(`Store write failed (${t}): ${error.message}`);
    }
  }
  const live = Object.fromEntries(TABLES.map((t) => [t, new Set(after[t].map((r) => keyOf(t, r)))])) as Record<Table, Set<string>>;
  for (const t of [...TABLES].reverse()) {
    for (const r of before[t].filter((r) => !live[t].has(keyOf(t, r)))) {
      let q = c.from(t).delete();
      for (const k of KEYS[t]) q = q.eq(k, r[k] as string);
      const { error } = await q;
      if (error) throw new Error(`Store delete failed (${t}): ${error.message}`);
    }
  }
}

// Canonical rows (same shape toRows produces), so the diff in write() is stable.
async function load(): Promise<{ store: Store; before: Rows }> {
  const raw = await readRows();
  if (!raw.rd_dashboards.length) {
    const s = seed();
    await write(raw, s);
    return { store: s, before: toRows(s) };
  }
  const store = fromRows(raw);
  return { store, before: toRows(store) };
}

export async function readStore(): Promise<Store> {
  return (await load()).store;
}

// Serverless: no in-memory queue needed — mutations are fast read-modify-write.
export async function mutateStore<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const { store, before } = await load();
  const result = await fn(store);
  await write(before, store);
  return result;
}

export async function loadStore(): Promise<{ store: Store; now: number }> {
  await connection();
  const store = await readStore();
  return { store, now: Date.now() };
}

export function toSourceInfo(s: Source): SourceInfo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secret, ...rest } = s;
  return rest;
}
