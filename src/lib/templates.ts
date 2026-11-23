import type { DashboardPage, Format, TableColumn, Widget } from "./types";

/**
 * Templates are nothing more than filled-in widget config. They are bound to
 * the mock endpoints described in mock-backend.md (/users, /revenue, /content).
 */

export const SEED_SOURCES = [
  { id: "src_users", name: "v2 users", path: "/users" },
  { id: "src_revenue", name: "v2 revenue", path: "/revenue" },
  { id: "src_content", name: "v2 content", path: "/content" },
] as const;

const U = "src_users";
const R = "src_revenue";
const C = "src_content";

const cur: Format = { unit: "currency" };
const pct: Format = { unit: "percent", decimals: 1 };

type G = [x: number, y: number, w: number, h: number];
const grid = ([x, y, w, h]: G) => ({ x, y, w, h });

const stat = (id: string, title: string, src: string, value: string, g: G, delta?: string, format?: Format): Widget => ({
  id,
  type: "stat",
  title,
  source_id: src,
  bindings: delta ? { value, delta } : { value },
  ...(format ? { format: { value: format } } : {}),
  grid: grid(g),
});

const series = (id: string, type: "bar" | "line", title: string, src: string, rows: string, y: string, g: G, format?: Format): Widget => ({
  id,
  type,
  title,
  source_id: src,
  bindings: { rows, x: "date", y },
  ...(format ? { format: { y: format } } : {}),
  grid: grid(g),
});

const items = (id: string, type: "breakdown" | "funnel", title: string, src: string, rows: string, label: string, value: string, g: G): Widget => ({
  id,
  type,
  title,
  source_id: src,
  bindings: { rows, label, value },
  grid: grid(g),
});

const table = (id: string, title: string, src: string, rows: string, columns: TableColumn[], g: G): Widget => ({
  id,
  type: "table",
  title,
  source_id: src,
  bindings: { rows },
  columns,
  grid: grid(g),
});

const RETENTION: TableColumn[] = [
  { label: "Cohort", field: "cohort", format: { unit: "date" } },
  { label: "Signups", field: "signups" },
  { label: "M+1", field: "m1_pct", format: pct },
  { label: "M+2", field: "m2_pct", format: pct },
  { label: "M+3", field: "m3_pct", format: pct },
];

export const TEMPLATE_PAGES: DashboardPage[] = [
  {
    id: "overview",
    name: "Overview",
    widgets: [
      stat("ov_accounts", "Accounts", U, "totals.accounts", [0, 0, 3, 1]),
      stat("ov_signups", "Signups", U, "period.signups.value", [3, 0, 3, 1], "period.signups.delta_pct"),
      stat("ov_mrr", "MRR", R, "totals.mrr", [6, 0, 3, 1], undefined, cur),
      stat("ov_revenue", "Revenue", R, "period.revenue.value", [9, 0, 3, 1], "period.revenue.delta_pct", cur),
      series("ov_signups_chart", "bar", "Signups", U, "series.signups", "count", [0, 1, 8, 2]),
      items("ov_user_type", "breakdown", "User type", U, "breakdowns.by_user_type", "user_type", "count", [8, 1, 4, 2]),
      items("ov_funnel", "funnel", "Conversion", U, "breakdowns.conversion_funnel", "step", "count", [0, 3, 4, 2]),
      table("ov_retention", "Retention by cohort", U, "breakdowns.retention", RETENTION, [4, 3, 8, 2]),
    ],
  },
  {
    id: "users",
    name: "Users",
    widgets: [
      stat("us_accounts", "Accounts", U, "totals.accounts", [0, 0, 3, 1]),
      stat("us_signups", "Signups", U, "period.signups.value", [3, 0, 3, 1], "period.signups.delta_pct"),
      stat("us_active", "Active accounts", U, "period.active_accounts.value", [6, 0, 3, 1], "period.active_accounts.delta_pct"),
      stat("us_sessions", "Active sessions", U, "totals.active_sessions", [9, 0, 3, 1]),
      series("us_signups_chart", "line", "Signups", U, "series.signups", "count", [0, 1, 8, 2]),
      items("us_user_type", "breakdown", "User type", U, "breakdowns.by_user_type", "user_type", "count", [8, 1, 4, 2]),
      items("us_role", "breakdown", "Role", U, "breakdowns.by_role", "role_name", "count", [0, 3, 4, 2]),
      table("us_retention", "Retention by cohort", U, "breakdowns.retention", RETENTION, [4, 3, 8, 2]),
    ],
  },
  {
    id: "revenue",
    name: "Revenue",
    widgets: [
      stat("rv_mrr", "MRR", R, "totals.mrr", [0, 0, 3, 1], undefined, cur),
      stat("rv_arr", "ARR", R, "totals.arr", [3, 0, 3, 1], undefined, cur),
      stat("rv_subs", "Active subscriptions", R, "totals.active_subscriptions", [6, 0, 3, 1]),
      stat("rv_revenue", "Revenue", R, "period.revenue.value", [9, 0, 3, 1], "period.revenue.delta_pct", cur),
      series("rv_revenue_chart", "line", "Revenue", R, "series.revenue", "total", [0, 1, 8, 2], cur),
      items("rv_status", "breakdown", "Subscription status", R, "breakdowns.subscriptions_by_status", "status", "count", [8, 1, 4, 2]),
      table(
        "rv_plans",
        "Subscribers per plan",
        R,
        "breakdowns.subscribers_by_plan",
        [
          { label: "Plan", field: "plan_name" },
          { label: "Interval", field: "billing_interval" },
          { label: "Subscribers", field: "count" },
          { label: "MRR", field: "mrr", format: cur },
        ],
        [0, 3, 6, 2],
      ),
      table(
        "rv_orders",
        "Orders by kind",
        R,
        "breakdowns.orders_by_kind",
        [
          { label: "Kind", field: "product_kind" },
          { label: "Orders", field: "count" },
          { label: "Revenue", field: "revenue", format: cur },
        ],
        [6, 3, 6, 2],
      ),
      stat("rv_orders_n", "Orders", R, "period.orders.value", [0, 5, 3, 1], "period.orders.delta_pct"),
      stat("rv_new_subs", "New subscriptions", R, "period.new_subscriptions.value", [3, 5, 3, 1], "period.new_subscriptions.delta_pct"),
      stat("rv_ending", "Ending at period end", R, "totals.cancel_at_period_end", [6, 5, 3, 1]),
      stat("rv_pending", "Reports pending", R, "totals.reports_pending", [9, 5, 3, 1]),
    ],
  },
  {
    id: "content",
    name: "Content",
    widgets: [
      stat("ct_published", "Pages published", C, "totals.pages_published", [0, 0, 3, 1]),
      stat("ct_draft", "Pages in draft", C, "totals.pages_draft", [3, 0, 3, 1]),
      stat("ct_media", "Media files", C, "totals.media_files", [6, 0, 3, 1]),
      stat("ct_edits", "Edits", C, "period.edits.value", [9, 0, 3, 1], "period.edits.delta_pct"),
      series("ct_edits_chart", "bar", "Editor activity", C, "series.edits", "count", [0, 1, 7, 2]),
      table(
        "ct_locale",
        "Pages by locale",
        C,
        "breakdowns.pages_by_locale",
        [
          { label: "Locale", field: "locale" },
          { label: "Published", field: "published" },
          { label: "Draft", field: "draft" },
        ],
        [7, 1, 5, 2],
      ),
      table(
        "ct_catalogs",
        "Catalogs",
        C,
        "breakdowns.catalogs",
        [
          { label: "Catalog", field: "catalog_name" },
          { label: "Items", field: "items" },
          { label: "Visible", field: "visible" },
          { label: "Hours since sync", field: "hours_since_sync" },
          { label: "Last synced", field: "last_synced_at", format: { unit: "date" } },
        ],
        [0, 3, 12, 2],
      ),
    ],
  },
];

/** Single widgets offered in "Add widget → From template": every template widget, once per (source, title, type). */
export const TEMPLATE_WIDGETS: Widget[] = (() => {
  const seen = new Set<string>();
  const out: Widget[] = [];
  for (const page of TEMPLATE_PAGES) {
    for (const w of page.widgets) {
      const key = `${w.source_id}|${w.type}|${w.title}|${w.bindings.value ?? w.bindings.rows}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(w);
    }
  }
  return out;
})();
