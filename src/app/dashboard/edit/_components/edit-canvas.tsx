"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WidgetView } from "@/components/widgets/widget-view";
import { addPageAction, deletePageAction, deleteWidgetAction, duplicateWidgetAction, renamePageAction } from "@/lib/actions";
import { TEMPLATE_PAGES } from "@/lib/templates";
import type { DashboardPage, Period, SourceInfo } from "@/lib/types";
import { GRID_ROW, gridStyle, viewProps, type SnapMap } from "@/lib/view";
import { dashboardHref, PeriodLinks, SourceBadge } from "../../_components/dashboard-header";
import { AddWidgetModal } from "./add-widget-modal";

interface EditCanvasProps {
  dashboardId: string;
  dashboardName: string;
  pages: { id: string; name: string }[];
  page: DashboardPage;
  range: Period;
  sources: SourceInfo[];
  snaps: SnapMap;
}

export const widgetHref = (dashboardId: string, page: string, id: string, range: Period) =>
  `/dashboard/edit/widget?d=${encodeURIComponent(dashboardId)}&page=${encodeURIComponent(page)}&id=${encodeURIComponent(id)}&range=${range}`;

export function EditCanvas({ dashboardId, dashboardName, pages, page, range, sources, snaps }: EditCanvasProps) {
  const router = useRouter();
  const editHref = (page: string, r: Period) => dashboardHref(dashboardId, page, r, "/dashboard/edit");
  const sourceIds = sources.map((s) => s.id);
  // only templates whose sources exist in this dashboard make sense here
  const pageTemplates = TEMPLATE_PAGES.filter((t) => t.widgets.every((w) => sourceIds.includes(w.source_id)));
  const [addOpen, setAddOpen] = useState(false);
  const [pageMenu, setPageMenu] = useState(false);
  const [name, setName] = useState(page.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function commitName() {
    const next = name.trim();
    if (!next) return setName(page.name);
    if (next !== page.name) start(async () => void (await renamePageAction(dashboardId, page.id, next)));
  }

  function newPage(templateId?: string) {
    setPageMenu(false);
    start(async () => {
      const r = await addPageAction(dashboardId, templateId ? "" : "New page", templateId);
      if (r.ok) router.push(editHref(r.id, range));
    });
  }

  function removePage() {
    if (!window.confirm(`Delete page “${page.name}” and its ${page.widgets.length} widget(s)?`)) return;
    start(async () => {
      const r = await deletePageAction(dashboardId, page.id);
      if (!r.ok) return setError(r.error);
      router.push(editHref(pages.find((p) => p.id !== page.id)!.id, range));
    });
  }

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-3.5rem)]">
      <AddWidgetModal open={addOpen} onClose={() => setAddOpen(false)} dashboardId={dashboardId} pageId={page.id} range={range} sources={sources} />

      {/* Edit mode command bar */}
      <div className="sticky top-14 z-30 bg-surface-container-lowest border-b border-outline-variant/30 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={dashboardHref(dashboardId, page.id, range)} className="w-7 h-7 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div className="flex items-center gap-1.5 text-[0.875rem]">
            <Link href="/" className="text-outline hover:text-on-surface cursor-pointer transition-colors">
              Dashboards
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-[1.125rem] font-semibold text-on-surface tracking-tight">{dashboardName}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[0.75rem] px-2 py-0.5 rounded bg-secondary-container/50 text-on-secondary-container border border-secondary-container font-medium font-mono">
            <span className={`w-1.5 h-1.5 rounded-full bg-primary ${pending ? "animate-ping" : "animate-pulse"}`} />
            {pending ? "Saving…" : "Editing"}
          </span>
          <SourceBadge dashboardId={dashboardId} total={sources.length} failing={sources.filter((s) => s.status === "error").length} />
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <PeriodLinks range={range} hrefFor={(p) => editHref(page.id, p)} />
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-lowest hover:bg-surface-container-low text-on-surface border border-outline-variant/50 transition-all text-[0.875rem] font-medium shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">add</span>
            Add widget
          </button>
          <Link
            href={dashboardHref(dashboardId, page.id, range)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-primary-container hover:bg-primary text-on-primary transition-all text-[0.875rem] font-medium shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            Done
          </Link>
        </div>
      </div>

      {/* Editable tabs bar */}
      <div className="bg-surface-container-lowest/80 border-b border-outline-variant/30 px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 -mb-px min-w-0">
          {pages.map((p) =>
            p.id === page.id ? (
              <div key={p.id} className="flex items-center gap-1 px-3 py-2 border-b-2 border-primary bg-surface-container-low/40">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  aria-label="Page name"
                  className="bg-transparent border border-outline-variant/40 rounded px-1.5 py-0.5 text-on-surface font-semibold text-[0.875rem] w-32 focus:outline-none focus:border-primary focus:bg-surface-container-lowest"
                />
                {pages.length > 1 && (
                  <button onClick={removePage} title="Delete page" className="text-outline hover:text-error p-0.5 rounded">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                )}
              </div>
            ) : (
              <Link
                key={p.id}
                href={editHref(p.id, range)}
                className="px-3.5 py-2 border-b-2 border-transparent text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors text-[0.875rem] whitespace-nowrap"
              >
                {p.name}
              </Link>
            ),
          )}
          <div className="relative">
            <button
              onClick={() => setPageMenu((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 ml-1 text-outline hover:text-primary hover:bg-surface-container-high rounded text-[0.6875rem] font-medium transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New page
            </button>
            {pageMenu && (
              <div className="absolute left-0 top-full mt-1 z-40 w-52 bg-surface-container-lowest border border-outline-variant/40 rounded-[6px] shadow-lg py-1 text-[0.8125rem]">
                <button onClick={() => newPage()} className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low text-on-surface font-medium">
                  Blank page
                </button>
                {pageTemplates.length > 0 && <div className="px-3 pt-2 pb-1 text-[0.6875rem] font-semibold text-outline uppercase tracking-wider border-t border-surface-container mt-1">From template</div>}
                {pageTemplates.map((t) => (
                  <button key={t.id} onClick={() => newPage(t.id)} className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low text-on-surface flex justify-between">
                    <span>{t.name}</span>
                    <span className="font-mono text-[11px] text-outline">{t.widgets.length} widgets</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3 font-mono text-[0.75rem] text-outline shrink-0">
          <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
          Canvas: 12 cols · changes save immediately
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 p-2.5 rounded-[6px] bg-error-container/50 border border-error/30 text-[0.8125rem] text-error flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="material-symbols-outlined text-[16px]">
            close
          </button>
        </div>
      )}

      {/* Main canvas */}
      <div className="flex-1 p-6 relative bg-surface">
        {/* 12-col blueprint overlay */}
        <div aria-hidden className="absolute inset-0 pointer-events-none p-6 grid grid-cols-12 gap-4 opacity-20 select-none max-w-[1400px]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-full border-x border-dashed border-outline-variant/50 bg-surface-container-high/10" />
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-12 gap-4 max-w-[1400px]" style={{ gridAutoRows: GRID_ROW }}>
          {page.widgets.map((w) => (
            <div key={w.id} className="relative group min-w-0 rounded-[8px] outline-dashed outline-1 outline-offset-2 outline-outline-variant hover:outline-primary transition-all [&>*:first-child]:h-full" style={gridStyle(w.grid)}>
              <WidgetView widget={w} {...viewProps(w, sources, snaps)} />

              {/* Hover tooling */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-0.5 bg-surface-container-lowest border border-outline-variant/40 shadow-sm rounded px-1 py-0.5">
                <Link href={widgetHref(dashboardId, page.id, w.id, range)} title="Edit" className="text-outline hover:text-primary p-0.5 rounded flex">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </Link>
                <button title="Duplicate" onClick={() => start(async () => void (await duplicateWidgetAction(dashboardId, page.id, w.id)))} className="text-outline hover:text-on-surface p-0.5 rounded flex">
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
                <button
                  title="Delete"
                  onClick={() => window.confirm(`Delete widget “${w.title}”?`) && start(async () => void (await deleteWidgetAction(dashboardId, page.id, w.id)))}
                  className="text-outline hover:text-error p-0.5 rounded flex"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>

              {/* Position metadata */}
              <div className="absolute -bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 rounded bg-primary-container text-on-primary font-mono text-[10px] leading-4">
                col {w.grid.x + 1} · row {w.grid.y + 1} · {w.grid.w}×{w.grid.h}
              </div>
            </div>
          ))}

          {/* Add widget placeholder: always on its own row below the last widget */}
          <button
            onClick={() => setAddOpen(true)}
            style={{ gridColumn: "1 / span 3", gridRow: `${Math.max(0, ...page.widgets.map((w) => w.grid.y + w.grid.h)) + 1}` }}
            className="border-2 border-dashed border-outline-variant/40 rounded-[8px] hover:border-primary hover:bg-surface-container-low/50 transition-all p-3 flex flex-col items-center justify-center gap-2 min-h-[100px] text-outline hover:text-primary group"
          >
            <span className="material-symbols-outlined text-[28px] group-hover:scale-110 transition-transform">add_circle</span>
            <span className="text-[0.75rem] font-medium">Add widget</span>
          </button>
        </div>
      </div>
    </div>
  );
}
