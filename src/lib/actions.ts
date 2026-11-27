"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { clampGrid, compact, findFreeSlot } from "./grid";
import { mutateStore, readStore } from "./store";
import { connectorOf, isDemo, validateConnector } from "./connectors";
import { DEMO_HINT } from "./connectors/catalog";
import { open, seal } from "./secrets";
import { fetchAllPeriods, syncSources, validateSourceUrl } from "./sync";
import { TEMPLATE_PAGES, TEMPLATE_WIDGETS } from "./templates";
import { isTable, DEFAULT_PERIOD, DEFAULT_SIZE, SOURCE_KINDS, WIDGET_TYPES, type FetchResult, type SourceKind, type Store, type Widget, type WidgetType } from "./types";

// Prototype: there is no login yet. Every action here must check the super
// admin session before this goes anywhere near production.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const newId = (prefix: string) => `${prefix}_${randomUUID().slice(0, 8)}`;
const dashboardOf = (s: Store, dashboardId: string) => s.dashboards.find((d) => d.id === dashboardId);
const pageOf = (s: Store, dashboardId: string, pageId: string) => dashboardOf(s, dashboardId)?.pages.find((p) => p.id === pageId);

/* ── Dashboards ───────────────────────────────────────────── */

export async function createDashboardAction(input: { name: string; description: string }): Promise<Result<{ id: string }>> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const id = await mutateStore((s) => {
    if (s.dashboards.some((d) => d.name.toLowerCase() === name.toLowerCase())) return null;
    const id = newId("d");
    // a new dashboard starts with one empty page and no sources
    s.dashboards.push({ id, name, description: input.description.trim(), pages: [{ id: newId("p"), name: "Overview", widgets: [] }] });
    return id;
  });
  if (!id) return { ok: false, error: "A dashboard with this name already exists." };
  refresh();
  return { ok: true, id };
}

export async function deleteDashboardAction(dashboardId: string): Promise<Result> {
  const ok = await mutateStore((s) => {
    if (s.dashboards.length <= 1) return false;
    s.dashboards = s.dashboards.filter((d) => d.id !== dashboardId);
    // its sources and their snapshots go with it
    const gone = new Set(s.sources.filter((x) => x.dashboardId === dashboardId).map((x) => x.id));
    s.sources = s.sources.filter((x) => !gone.has(x.id));
    for (const key of Object.keys(s.snapshots)) if (gone.has(s.snapshots[key].sourceId)) delete s.snapshots[key];
    return true;
  });
  if (!ok) return { ok: false, error: "The last dashboard cannot be deleted." };
  refresh();
  return { ok: true };
}

/* ── Sources ──────────────────────────────────────────────── */

export interface SourceInput {
  /** set when editing an existing source */
  id?: string;
  kind: SourceKind;
  /** only for kind "endpoint" */
  url: string;
  /** secret fields. When editing, an empty one keeps the stored value. */
  credentials: Record<string, string>;
  config: Record<string, string>;
}

const trimAll = (o: Record<string, string>) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, String(v ?? "").trim()]));

/** Cleans the form and fills blank secrets from the stored source. Returns the problem as a string. */
async function resolveSource(input: SourceInput): Promise<{ credentials: Record<string, string>; config: Record<string, string> } | string> {
  if (!SOURCE_KINDS.includes(input.kind)) return "Unknown source type.";
  const config = trimAll(input.config);
  let credentials = trimAll(input.credentials);
  if (input.id) {
    const stored = (await readStore()).sources.find((x) => x.id === input.id);
    if (!stored || stored.kind !== input.kind) return "Source no longer exists.";
    try {
      const kept = open(stored.secret);
      credentials = Object.fromEntries([...new Set([...Object.keys(kept), ...Object.keys(credentials)])].map((k) => [k, credentials[k] || kept[k] || ""]));
    } catch (e) {
      // the stored blob is unreadable: everything has to be typed again
      if (Object.values(credentials).every((v) => !v)) return (e as Error).message;
    }
  }
  if (input.kind === "endpoint") {
    const v = validateSourceUrl(input.url);
    return v.ok ? { credentials, config } : v.message;
  }
  return validateConnector(input.kind, credentials, config) ?? { credentials, config };
}

/** Tries the source without saving anything and returns the default period, for the preview. */
export async function testSourceAction(input: SourceInput): Promise<FetchResult> {
  const r = await resolveSource(input);
  if (typeof r === "string") return { ok: false, kind: input.kind === "endpoint" ? "blocked" : "invalid", ms: 0, message: r };
  return (await fetchAllPeriods(input.kind, input.url, r.credentials, r.config))[DEFAULT_PERIOD];
}

export async function saveSourceAction(input: SourceInput & { dashboardId: string; name: string; addPage?: boolean }): Promise<Result<{ id: string; pageId?: string }>> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const r = await resolveSource(input);
  if (typeof r === "string") return { ok: false, error: r };

  const { kind } = input;
  const url = kind === "endpoint" ? input.url.trim() : "";
  const secret = seal(r.credentials);
  const keyHint =
    kind === "endpoint" ? (r.credentials.apiKey ? `••••${r.credentials.apiKey.slice(-4)}` : "") : isDemo(kind, r.credentials) ? DEMO_HINT : connectorOf(kind).hint(r.credentials, r.config);

  const id = await mutateStore((s) => {
    if (input.id) {
      const src = s.sources.find((x) => x.id === input.id);
      if (!src) return null;
      Object.assign(src, { name, url, secret, keyHint, config: r.config });
      return src.id;
    }
    if (!dashboardOf(s, input.dashboardId)) return null;
    const id = newId("src");
    s.sources.push({ id, dashboardId: input.dashboardId, kind, name, url, secret, keyHint, config: r.config, status: "never", createdAt: new Date().toISOString() });
    return id;
  });
  if (!id) return { ok: false, error: "Source or dashboard no longer exists." };

  await syncSources([id]); // first snapshot for all four periods

  // A connector knows its own output, so it can bring a page of widgets with it.
  let pageId: string | undefined;
  if (input.addPage && !input.id && kind !== "endpoint") {
    pageId = await mutateStore((s) => {
      const d = dashboardOf(s, input.dashboardId);
      if (!d) return undefined;
      const tpl = connectorOf(kind).page(id);
      let pageName = tpl.name;
      for (let n = 2; d.pages.some((p) => p.name === pageName); n++) pageName = `${tpl.name} ${n}`;
      const page = { id: newId("p"), name: pageName, widgets: tpl.widgets.map((w) => ({ ...w, id: newId("w") })) };
      d.pages.push(page);
      return page.id;
    });
  }
  refresh();
  return { ok: true, id, pageId };
}

export async function deleteSourceAction(id: string): Promise<Result> {
  await mutateStore((s) => {
    s.sources = s.sources.filter((x) => x.id !== id);
    for (const key of Object.keys(s.snapshots)) if (s.snapshots[key].sourceId === id) delete s.snapshots[key];
  });
  refresh();
  return { ok: true };
}

/** One source, every source of one dashboard, or (no target) everything. */
export async function syncAction(target?: { sourceId?: string; dashboardId?: string }): Promise<Result<{ synced: number; failed: number }>> {
  let ids: string[] | undefined;
  if (target?.sourceId) ids = [target.sourceId];
  else if (target?.dashboardId) ids = (await readStore()).sources.filter((s) => s.dashboardId === target.dashboardId).map((s) => s.id);
  const r = await syncSources(ids);
  refresh();
  return { ok: true, ...r };
}

/* ── Pages ────────────────────────────────────────────────── */

export async function addPageAction(dashboardId: string, name: string, templateId?: string): Promise<Result<{ id: string }>> {
  const id = await mutateStore((s) => {
    const d = dashboardOf(s, dashboardId);
    if (!d) return null;
    const id = newId("p");
    const tpl = TEMPLATE_PAGES.find((t) => t.id === templateId);
    d.pages.push({
      id,
      name: name.trim() || tpl?.name || "New page",
      widgets: tpl ? tpl.widgets.map((w) => ({ ...structuredClone(w), id: newId("w") })) : [],
    });
    return id;
  });
  if (!id) return { ok: false, error: "Dashboard no longer exists." };
  refresh();
  return { ok: true, id };
}

export async function renamePageAction(dashboardId: string, pageId: string, name: string): Promise<Result> {
  if (!name.trim()) return { ok: false, error: "Name is required." };
  await mutateStore((s) => {
    const p = pageOf(s, dashboardId, pageId);
    if (p) p.name = name.trim();
  });
  refresh();
  return { ok: true };
}

export async function deletePageAction(dashboardId: string, pageId: string): Promise<Result> {
  const ok = await mutateStore((s) => {
    const d = dashboardOf(s, dashboardId);
    if (!d || d.pages.length <= 1) return false;
    d.pages = d.pages.filter((x) => x.id !== pageId);
    return true;
  });
  if (!ok) return { ok: false, error: "A dashboard needs at least one page." };
  refresh();
  return { ok: true };
}

/* ── Widgets ──────────────────────────────────────────────── */

function cleanWidget(w: Widget): Widget {
  const type: WidgetType = WIDGET_TYPES.includes(w.type) ? w.type : "stat";
  const bindings: Record<string, string> = {};
  for (const [k, v] of Object.entries(w.bindings ?? {})) if (typeof v === "string" && v.trim()) bindings[k] = v.trim();
  return {
    id: w.id,
    type,
    title: String(w.title ?? "").trim() || "Untitled",
    source_id: String(w.source_id ?? ""),
    bindings,
    ...(isTable(type)
      ? { columns: (w.columns ?? []).filter((c) => c.field?.trim()).map((c) => ({ ...c, field: c.field.trim(), label: c.label?.trim() || c.field.trim() })) }
      : {}),
    ...(w.format && Object.keys(w.format).length ? { format: w.format } : {}),
    grid: clampGrid(w.grid ?? {}),
  };
}

export async function addWidgetAction(
  dashboardId: string,
  pageId: string,
  input: { templateId: string } | { title: string; type: WidgetType; source_id: string },
): Promise<Result<{ id: string }>> {
  const id = await mutateStore((s) => {
    const page = pageOf(s, dashboardId, pageId);
    if (!page) return null;
    let w: Widget;
    if ("templateId" in input) {
      const tpl = TEMPLATE_WIDGETS.find((t) => t.id === input.templateId);
      if (!tpl) return null;
      w = { ...structuredClone(tpl), id: newId("w") };
    } else {
      w = cleanWidget({ id: newId("w"), type: input.type, title: input.title, source_id: input.source_id, bindings: {}, grid: { x: 0, y: 0, ...DEFAULT_SIZE[input.type] } });
    }
    w.grid = { ...w.grid, ...findFreeSlot(page.widgets, w.grid.w, w.grid.h) };
    page.widgets.push(w);
    return w.id;
  });
  if (!id) return { ok: false, error: "Page or template not found." };
  refresh();
  return { ok: true, id };
}

export async function saveWidgetAction(dashboardId: string, pageId: string, widget: Widget): Promise<Result> {
  const ok = await mutateStore((s) => {
    const page = pageOf(s, dashboardId, pageId);
    const i = page?.widgets.findIndex((w) => w.id === widget.id) ?? -1;
    if (!page || i < 0) return false;
    page.widgets[i] = cleanWidget(widget);
    page.widgets = compact(page.widgets, widget.id);
    return true;
  });
  if (!ok) return { ok: false, error: "Widget no longer exists." };
  refresh();
  return { ok: true };
}

export async function duplicateWidgetAction(dashboardId: string, pageId: string, widgetId: string): Promise<Result> {
  await mutateStore((s) => {
    const page = pageOf(s, dashboardId, pageId);
    const src = page?.widgets.find((w) => w.id === widgetId);
    if (!page || !src) return;
    const copy: Widget = { ...structuredClone(src), id: newId("w"), title: `${src.title} (copy)` };
    copy.grid = { ...copy.grid, ...findFreeSlot(page.widgets, copy.grid.w, copy.grid.h) };
    page.widgets.push(copy);
  });
  refresh();
  return { ok: true };
}

export async function deleteWidgetAction(dashboardId: string, pageId: string, widgetId: string): Promise<Result> {
  await mutateStore((s) => {
    const page = pageOf(s, dashboardId, pageId);
    if (page) page.widgets = compact(page.widgets.filter((w) => w.id !== widgetId));
  });
  refresh();
  return { ok: true };
}
