import { PERIODS, type FetchResult, type Period, type SourceKind } from "../types";
import { brevo } from "./brevo";
import { connectorDef } from "./catalog";
import { ConnectorError, type Connector } from "./core";
import { ga4, gsc } from "./google";
import { paypal } from "./paypal";
import { stripe } from "./stripe";

export type ConnectorKind = Exclude<SourceKind, "endpoint">;

const CONNECTORS: Record<ConnectorKind, Connector> = { stripe, paypal, brevo, ga4, gsc };

export const connectorOf = (kind: ConnectorKind) => CONNECTORS[kind];

/** A whole sync of one connector may take this long. */
const SYNC_BUDGET_MS = 120_000;

/** Development only: the first secret field holds the word "demo". */
export function isDemo(kind: ConnectorKind, credentials: Record<string, string>): boolean {
  if (process.env.ALLOW_MOCK_SOURCES !== "true") return false;
  const first = connectorDef(kind)?.fields.find((f) => f.secret);
  return Boolean(first) && credentials[first!.key]?.trim().toLowerCase() === "demo";
}

/** Checks the form before anything is sent anywhere. Returns the problem, or null. */
export function validateConnector(kind: ConnectorKind, credentials: Record<string, string>, config: Record<string, string>): string | null {
  const def = connectorDef(kind);
  if (!def) return "Unknown connector.";
  for (const f of def.fields) {
    const value = (f.secret ? credentials : config)[f.key]?.trim() ?? "";
    if (!value && !f.optional && !f.options) return `${f.label} is required.`;
    if (value && f.options && !f.options.includes(value)) return `${f.label} must be one of: ${f.options.join(", ")}.`;
  }
  if (isDemo(kind, credentials)) return null;
  if (kind === "stripe") {
    const key = credentials.apiKey.trim();
    if (key.startsWith("sk_live_")) return "This is a full secret key. Create a restricted read-only key (rk_live_…) in Stripe and use that instead.";
    if (!/^(rk_(live|test)_|sk_test_)/.test(key)) return "A Stripe restricted key starts with rk_live_ or rk_test_.";
  }
  return null;
}

/**
 * Runs a connector once and hands back one result per period, in the same
 * shape a JSON endpoint gives. A failure applies to all four periods.
 */
export async function fetchConnector(kind: ConnectorKind, credentials: Record<string, string>, config: Record<string, string>): Promise<Record<Period, FetchResult>> {
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  const all = (r: FetchResult) => Object.fromEntries(PERIODS.map((p) => [p, r])) as Record<Period, FetchResult>;

  const problem = validateConnector(kind, credentials, config);
  if (problem) return all({ ok: false, kind: "invalid", ms: 0, message: problem });

  try {
    const data = await CONNECTORS[kind].fetchAll({ credentials, config, demo: isDemo(kind, credentials), deadline: Date.now() + SYNC_BUDGET_MS, now: new Date() });
    const took = ms();
    return Object.fromEntries(PERIODS.map((p) => [p, { ok: true, status: 200, ms: took, bytes: Buffer.byteLength(JSON.stringify(data[p])), data: data[p] }])) as Record<Period, FetchResult>;
  } catch (e) {
    if (e instanceof ConnectorError) return all({ ok: false, kind: e.kind, status: e.status, ms: ms(), message: e.message });
    console.error(`[connector:${kind}]`, e);
    return all({ ok: false, kind: "invalid", ms: ms(), message: "The service answered in a shape this connector does not understand." });
  }
}
