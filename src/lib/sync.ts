import { randomUUID } from "node:crypto";
import { fetchConnector } from "./connectors";
import { open } from "./secrets";
import { mutateStore, readStore } from "./store";
import { PERIODS, snapKey, type FetchResult, type Period, type Source, type SourceKind, type SyncRun } from "./types";

const TIMEOUT_MS = 10_000;

/* ── URL validation (SSRF) ────────────────────────────────────
   Only https, no private or loopback hosts. The mock backend runs on
   localhost, so hosts listed in MOCK_SOURCE_HOSTS are let through, and only
   when ALLOW_MOCK_SOURCES is exactly "true".
   Prototype gap: the hostname is not resolved, so a public name that points
   at a private IP is not caught here. */

function mockHosts(): string[] {
  if (process.env.ALLOW_MOCK_SOURCES !== "true") return [];
  return (process.env.MOCK_SOURCE_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h.includes(":")) return true; // IPv6 literal: not allowed at all
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
  );
}

export function validateSourceUrl(raw: string): { ok: true; url: URL } | { ok: false; message: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, message: "Not a valid URL. Include the scheme, for example https://example.com/api/stats" };
  }
  if (url.username || url.password) return { ok: false, message: "Credentials in the URL are not allowed. Use the API key field." };
  if (mockHosts().includes(url.host.toLowerCase())) return { ok: true, url };
  if (url.protocol !== "https:") return { ok: false, message: "Only https:// endpoints are allowed." };
  if (isPrivateHost(url.hostname)) return { ok: false, message: "Private, local and loopback addresses are not allowed." };
  return { ok: true, url };
}

/* ── Fetch one period ─────────────────────────────────────── */

export async function fetchSource(rawUrl: string, apiKey: string, period: Period): Promise<FetchResult> {
  const v = validateSourceUrl(rawUrl);
  if (!v.ok) return { ok: false, kind: "blocked", ms: 0, message: v.message };
  v.url.searchParams.set("range", period);

  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  try {
    const res = await fetch(v.url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "manual", // a redirect could point anywhere, so it counts as a failure
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, kind: "auth", status: res.status, ms: ms(), message: `Key rejected (${res.status})` };
    if (res.status === 429) return { ok: false, kind: "rate_limit", status: 429, ms: ms(), message: "Rate limited (429)" };
    if (!res.ok) return { ok: false, kind: "http", status: res.status, ms: ms(), message: `Endpoint answered HTTP ${res.status}` };

    const body = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      return { ok: false, kind: "invalid", status: res.status, ms: ms(), message: "Response is not JSON" };
    }
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, kind: "invalid", status: res.status, ms: ms(), message: "Response must be a JSON object" };
    }
    return { ok: true, status: res.status, ms: ms(), bytes: Buffer.byteLength(body), data };
  } catch (e) {
    const name = (e as Error).name;
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, kind: "timeout", ms: ms(), message: `No response within ${TIMEOUT_MS / 1000}s` };
    }
    return { ok: false, kind: "network", ms: ms(), message: "Endpoint unreachable" };
  }
}

/* ── All four periods of one source ───────────────────────────
   A JSON endpoint is called once per period. A connector reads its service
   once and cuts the four periods out of that. */

export async function fetchAllPeriods(kind: SourceKind, url: string, credentials: Record<string, string>, config: Record<string, string>): Promise<Record<Period, FetchResult>> {
  if (kind !== "endpoint") return fetchConnector(kind, credentials, config);
  const entries = await Promise.all(PERIODS.map(async (p) => [p, await fetchSource(url, credentials.apiKey ?? "", p)] as const));
  return Object.fromEntries(entries) as Record<Period, FetchResult>;
}

async function fetchStored(s: Source): Promise<Record<Period, FetchResult>> {
  let credentials: Record<string, string>;
  try {
    credentials = open(s.secret);
  } catch (e) {
    const failed: FetchResult = { ok: false, kind: "auth", ms: 0, message: (e as Error).message };
    return Object.fromEntries(PERIODS.map((p) => [p, failed])) as Record<Period, FetchResult>;
  }
  return fetchAllPeriods(s.kind, s.url, credentials, s.config);
}

/* ── Sync: snapshot kept on failure ───────────────────────── */

export async function syncSources(ids?: string[]): Promise<{ synced: number; failed: number }> {
  const store = await readStore();
  const targets = store.sources.filter((s) => !ids || ids.includes(s.id));

  // Network first, outside the store queue, so slow endpoints don't block writes.
  const results = await Promise.all(
    targets.map(async (s: Source) => {
      const byPeriod = await fetchStored(s);
      const at = new Date().toISOString();
      return { id: s.id, perPeriod: PERIODS.map((period) => ({ period, at, res: byPeriod[period] })) };
    }),
  );

  let synced = 0;
  let failed = 0;
  await mutateStore((st) => {
    for (const r of results) {
      const src = st.sources.find((s) => s.id === r.id);
      if (!src) continue; // removed while syncing
      const runs: SyncRun[] = [];
      let firstError: Source["lastError"];
      for (const { period, at, res } of r.perPeriod) {
        if (res.ok) {
          st.snapshots[snapKey(src.id, period)] = { sourceId: src.id, period, fetchedAt: at, bytes: res.bytes, data: res.data };
        } else {
          // the previous snapshot stays, so widgets keep showing the last good data
          firstError ??= { kind: res.kind, message: res.message, at };
        }
        runs.push({
          id: `run_${randomUUID().slice(0, 8)}`,
          sourceId: src.id,
          sourceName: src.name,
          period,
          status: res.ok ? "success" : "failed",
          httpStatus: res.status,
          durationMs: res.ms,
          bytes: res.ok ? res.bytes : 0,
          error: res.ok ? undefined : res.message,
          at,
        });
      }
      src.lastSyncAt = new Date().toISOString();
      src.status = firstError ? "error" : "ok";
      src.lastError = firstError;
      if (firstError) failed++;
      else synced++;
      st.runs.unshift(...runs);
    }
  });
  return { synced, failed };
}
