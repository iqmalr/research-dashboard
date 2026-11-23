import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { seal } from "./secrets";
import { SEED_SOURCES, TEMPLATE_PAGES } from "./templates";
import type { Source, SourceInfo, Store } from "./types";

/**
 * Prototype persistence: one JSON file instead of a database.
 * Holds what the real tables would hold (sources, snapshots, widget config,
 * sync runs). Delete the file to get the seeded demo back.
 */
const DIR = path.join(/* turbopackIgnore: true */ process.cwd(), ".data");
const FILE = path.join(DIR, "store.json");
const MAX_RUNS = 300;

const hintOf = (key: string) => (key ? `••••${key.slice(-4)}` : "");

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

type OldSource = Source & { apiKey?: string };
type OldStore = Omit<Store, "version"> & { version: number; dashboard?: Store["dashboards"][number] };

/**
 * v1 had a single `dashboard` and sources without an owner.
 * v2 kept one plain `apiKey` per source; v3 has a kind and encrypted credentials.
 * Returns true when something was rewritten.
 */
function migrate(raw: OldStore): boolean {
  let changed = false;
  if (raw.dashboard) {
    raw.dashboards = [raw.dashboard];
    for (const s of raw.sources) s.dashboardId ??= raw.dashboard.id;
    delete raw.dashboard;
    changed = true;
  }
  for (const s of raw.sources as OldSource[]) {
    if (s.kind) continue;
    s.kind = "endpoint";
    s.secret = seal({ apiKey: s.apiKey ?? "" });
    s.keyHint = hintOf(s.apiKey ?? "");
    s.config = {};
    delete s.apiKey;
    changed = true;
  }
  raw.version = 3;
  return changed;
}

async function write(store: Store) {
  store.runs = store.runs.slice(0, MAX_RUNS);
  await fs.mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 1));
  await fs.rename(tmp, FILE);
}

export async function readStore(): Promise<Store> {
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8"));
    // a migration is written back at once, so plain keys do not stay on disk
    if (migrate(raw)) await write(raw);
    return raw as Store;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const s = seed();
    await write(s);
    return s;
  }
}

// One writer at a time. Kept on globalThis so dev hot reloads share the queue.
const g = globalThis as unknown as { __storeQueue?: Promise<unknown> };

export function mutateStore<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const run = (g.__storeQueue ?? Promise.resolve()).then(async () => {
    const store = await readStore();
    const result = await fn(store);
    await write(store);
    return result;
  });
  g.__storeQueue = run.catch(() => {});
  return run;
}

/** For Server Components: waits for the request, so the page always shows the latest store. */
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
