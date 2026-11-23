import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { seal } from "./secrets";
import { SEED_SOURCES, TEMPLATE_PAGES } from "./templates";
import type { Source, SourceInfo, Store } from "./types";

const MAX_RUNS = 300;
const STORE_ID = "singleton";

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

async function write(store: Store) {
  store.runs = store.runs.slice(0, MAX_RUNS);
  const { error } = await db()
    .from("rd_store")
    .upsert({ id: STORE_ID, data: store, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Store write failed: ${error.message}`);
}

export async function readStore(): Promise<Store> {
  const { data, error } = await db()
    .from("rd_store")
    .select("data")
    .eq("id", STORE_ID)
    .single();

  if (error) {
    // PGRST116 = row not found → seed
    if (error.code === "PGRST116") {
      const s = seed();
      await write(s);
      return s;
    }
    throw new Error(`Store read failed: ${error.message}`);
  }

  return data.data as Store;
}

// Serverless: no in-memory queue needed — mutations are fast read-modify-write.
export async function mutateStore<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const store = await readStore();
  const result = await fn(store);
  await write(store);
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
