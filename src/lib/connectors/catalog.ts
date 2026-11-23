import type { SourceKind } from "../types";

/**
 * What the UI needs to know about each third-party connector. Pure data, safe
 * to import from client components. The code that talks to the services lives
 * next to this file and is server-only.
 */

export interface ConnectorField {
  key: string;
  label: string;
  /** secret fields are encrypted and never sent back to the browser; the rest is stored as plain config */
  secret: boolean;
  placeholder?: string;
  help?: string;
  multiline?: boolean;
  options?: string[];
  optional?: boolean;
}

export interface ConnectorDef {
  /** a SourceKind when implemented, otherwise just an id for the "planned" row */
  kind: string;
  group: string;
  name: string;
  mark: string;
  desc: string;
  fields: ConnectorField[];
  /** shown under the form */
  note?: string;
  /** testing: field values that connect to simulated data instead of the real service */
  sample?: Record<string, string>;
  /** the real API calls this connector makes, as read from the service's documentation */
  endpoints?: string[];
  /** set when the connector is listed but not built yet: the reason */
  planned?: string;
}

const SERVICE_ACCOUNT: ConnectorField = {
  key: "serviceAccount",
  label: "Service account key (JSON)",
  secret: true,
  multiline: true,
  placeholder: '{ "type": "service_account", "client_email": "…", "private_key": "…" }',
  help: "Create a service account in Google Cloud, download its JSON key and paste the whole file here.",
};

export const CONNECTOR_GROUPS = ["Payments", "Email", "Google", "WhatsApp"] as const;

export const CONNECTORS: ConnectorDef[] = [
  {
    kind: "stripe",
    group: "Payments",
    name: "Stripe",
    mark: "S",
    desc: "Payments, fees, refunds, subscriptions, MRR",
    fields: [
      { key: "apiKey", label: "Restricted key (read-only)", secret: true, placeholder: "rk_live_…", help: "Read access to Balance, Balance transactions, Subscriptions and Products. Full secret keys (sk_live_…) are refused." },
      { key: "currency", label: "Currency", secret: false, optional: true, placeholder: "eur", help: "Only needed when the account charges in several currencies. Empty = the most used one." },
    ],
    note: "Up to 24 months of balance transactions are read on every sync. Very large accounts are cut off at 30,000 transactions.",
    sample: { apiKey: "demo" },
    endpoints: ["GET api.stripe.com/v1/balance_transactions", "GET api.stripe.com/v1/subscriptions?status=all", "GET api.stripe.com/v1/products", "GET api.stripe.com/v1/balance"],
  },
  {
    kind: "paypal",
    group: "Payments",
    name: "PayPal",
    mark: "P",
    desc: "Uses Client ID + Secret. New transactions can lag up to 3 hours",
    fields: [
      { key: "clientId", label: "Client ID", secret: false, placeholder: "AYx…" },
      { key: "clientSecret", label: "Secret", secret: true, placeholder: "EL…" },
      { key: "environment", label: "Environment", secret: false, options: ["live", "sandbox"] },
      { key: "currency", label: "Currency", secret: false, optional: true, placeholder: "eur" },
    ],
    note: "The REST app needs the “Transaction search” permission. PayPal serves 31 days per request, so a sync makes about 24 calls.",
    sample: { clientId: "demo-client-id", clientSecret: "demo", environment: "sandbox" },
    endpoints: ["POST api-m.paypal.com/v1/oauth2/token", "GET api-m.paypal.com/v1/reporting/transactions"],
  },
  {
    kind: "resend",
    group: "Email",
    name: "Resend",
    mark: "R",
    desc: "Emails sent, opened, clicked",
    fields: [],
    planned: "Opens and clicks arrive by webhook, which needs a receiver and an event table first.",
  },
  {
    kind: "brevo",
    group: "Email",
    name: "Brevo",
    mark: "B",
    desc: "Transactional email: sent, delivered, opened, clicked, bounced",
    fields: [{ key: "apiKey", label: "API key", secret: true, placeholder: "xkeysib-…" }],
    note: "Reads the transactional (SMTP) statistics in 30-day chunks.",
    sample: { apiKey: "demo" },
    endpoints: ["GET api.brevo.com/v3/smtp/statistics/reports"],
  },
  {
    kind: "ga4",
    group: "Google",
    name: "Google Analytics 4",
    mark: "GA",
    desc: "Visitors, sessions, pages, countries, devices",
    fields: [
      { key: "propertyId", label: "Property ID", secret: false, placeholder: "382910443", help: "Admin → Property settings. Digits only." },
      SERVICE_ACCOUNT,
    ],
    note: "Add the service account email as a Viewer of the GA4 property, and enable the Google Analytics Data API in its Cloud project.",
    sample: { propertyId: "382910443", serviceAccount: "demo" },
    endpoints: ["POST oauth2.googleapis.com/token", "POST analyticsdata.googleapis.com/v1beta/properties/{id}:runReport", "POST analyticsdata.googleapis.com/v1beta/properties/{id}:batchRunReports"],
  },
  {
    kind: "gsc",
    group: "Google",
    name: "Search Console",
    mark: "SC",
    desc: "Clicks, impressions and positions in Google Search",
    fields: [
      { key: "siteUrl", label: "Property", secret: false, placeholder: "sc-domain:example.com", help: "Exactly as shown in Search Console: sc-domain:example.com or https://example.com/" },
      SERVICE_ACCOUNT,
    ],
    note: "Add the service account email as a user of the Search Console property, and enable the Search Console API. Data is 2 to 3 days behind.",
    sample: { siteUrl: "sc-domain:example.com", serviceAccount: "demo" },
    endpoints: ["POST oauth2.googleapis.com/token", "POST www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query"],
  },
  {
    kind: "whatsapp",
    group: "WhatsApp",
    name: "WhatsApp Business (Meta)",
    mark: "WA",
    desc: "Messages, read status, cost",
    fields: [],
    planned: "Not built yet: analytics live on the WhatsApp Business account and Meta changed the pricing model in 2025.",
  },
];

export const connectorDef = (kind: string) => CONNECTORS.find((c) => c.kind === kind);

/** "Stripe", or "JSON endpoint" for our own sources. */
export const kindLabel = (kind: SourceKind) => connectorDef(kind)?.name ?? "JSON endpoint";

/** What a source's key hint reads when it was connected with the sample values. */
export const DEMO_HINT = "test data";
