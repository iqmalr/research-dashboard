"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWidgetAction } from "@/lib/actions";
import { TEMPLATE_WIDGETS } from "@/lib/templates";
import { WIDGET_META, WIDGET_TYPES, type Period, type SourceInfo, type WidgetType } from "@/lib/types";

interface AddWidgetModalProps {
  open: boolean;
  onClose: () => void;
  dashboardId: string;
  pageId: string;
  range: Period;
  sources: SourceInfo[];
}

type Mode = "template" | "blank";

export function AddWidgetModal({ open, onClose, dashboardId, pageId, range, sources }: AddWidgetModalProps) {
  const router = useRouter();
  // templates are bound to specific sources; without those there is nothing to offer
  const hasTemplates = TEMPLATE_WIDGETS.some((t) => sources.some((s) => s.id === t.source_id));
  const [mode, setMode] = useState<Mode>(hasTemplates ? "template" : "blank");
  const [selected, setSelected] = useState(TEMPLATE_WIDGETS[0].id);
  const [blankTitle, setBlankTitle] = useState("");
  const [blankType, setBlankType] = useState<WidgetType>("stat");
  const [blankSource, setBlankSource] = useState(sources[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) return null;

  const tpl = TEMPLATE_WIDGETS.find((t) => t.id === selected) ?? TEMPLATE_WIDGETS[0];
  const sourceName = (id: string) => sources.find((s) => s.id === id)?.name;
  const tplUsable = Boolean(sourceName(tpl.source_id));

  function addTemplate() {
    start(async () => {
      const r = await addWidgetAction(dashboardId, pageId, { templateId: tpl.id });
      if (!r.ok) return setError(r.error);
      onClose();
    });
  }

  function addBlank() {
    start(async () => {
      const r = await addWidgetAction(dashboardId, pageId, { title: blankTitle || "New widget", type: blankType, source_id: blankSource });
      if (!r.ok) return setError(r.error);
      // Close first: this page's state is kept while the editor is open, so the
      // modal would still be showing when the user comes back.
      setBlankTitle("");
      onClose();
      // an empty widget is no use on its own: go straight to picking its fields
      router.push(`/dashboard/edit/widget?d=${encodeURIComponent(dashboardId)}&page=${encodeURIComponent(pageId)}&id=${encodeURIComponent(r.id)}&range=${range}`);
    });
  }

  // group templates by the source they read from
  const groups = sources
    .map((s) => ({ source: s, items: TEMPLATE_WIDGETS.filter((t) => t.source_id === s.id) }))
    .filter((g) => g.items.length > 0);
  const orphaned = TEMPLATE_WIDGETS.filter((t) => !sourceName(t.source_id));

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl max-h-[calc(100vh-3rem)] bg-surface-container-lowest rounded-[18px] shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">widgets</span>
            </div>
            <div>
              <h2 className="text-[1.125rem] font-semibold text-on-surface tracking-tight">Add widget</h2>
              <p className="text-[0.6875rem] text-outline">A template is a widget with its fields already chosen. You can change everything afterwards.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="border-b border-outline-variant/20 px-6 flex gap-6">
          {(["template", "blank"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-2.5 text-[0.875rem] border-b-2 font-medium transition-colors ${mode === m ? "border-primary text-on-surface font-semibold" : "border-transparent text-outline hover:text-on-surface"}`}
            >
              {m === "template" ? "From template" : "Start from blank"}
            </button>
          ))}
        </div>

        {error && <div className="mx-6 mt-3 p-2 rounded bg-error-container/50 border border-error/30 text-[0.75rem] text-error">{error}</div>}

        {mode === "template" ? (
          <div className="flex flex-1 min-h-0">
            {/* Template list */}
            <div className="w-80 shrink-0 border-r border-outline-variant/20 overflow-y-auto py-2">
              {groups.map((g) => (
                <div key={g.source.id}>
                  <div className="px-4 pt-2 pb-1 font-mono text-[0.6875rem] font-semibold text-outline uppercase tracking-wider">{g.source.name}</div>
                  {g.items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelected(t.id)}
                      className={`w-full flex items-center gap-2 px-4 py-1.5 text-left border-l-2 transition-colors ${selected === t.id ? "border-primary bg-secondary-container/30" : "border-transparent hover:bg-surface-container-low"}`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${selected === t.id ? "text-primary-container" : "text-on-surface-variant"}`}>{WIDGET_META[t.type].icon}</span>
                      <span className="text-[0.8125rem] text-on-surface font-medium truncate">{t.title}</span>
                      <span className="ml-auto font-mono text-[10px] text-outline uppercase">{t.type}</span>
                    </button>
                  ))}
                </div>
              ))}
              {orphaned.length > 0 && groups.length > 0 && (
                <p className="px-4 py-3 text-[0.75rem] text-outline">{orphaned.length} template(s) hidden because their source was removed.</p>
              )}
              {groups.length === 0 && <p className="px-4 py-3 text-[0.75rem] text-outline">No template matches the sources of this dashboard. Start from blank instead.</p>}
            </div>

            {/* Config preview */}
            <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-[22px] text-primary-container">{WIDGET_META[tpl.type].icon}</span>
                  <div>
                    <div className="font-semibold text-on-surface">{tpl.title}</div>
                    <div className="text-[0.75rem] text-outline">
                      {WIDGET_META[tpl.type].label} · {WIDGET_META[tpl.type].desc}
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-low/60 border border-outline-variant/30 rounded-[18px] p-3 font-mono text-[0.75rem] space-y-1.5">
                  <Row k="source" v={sourceName(tpl.source_id) ?? "(removed)"} />
                  {Object.entries(tpl.bindings).map(([slot, path]) => (
                    <Row key={slot} k={slot} v={path} />
                  ))}
                  {tpl.columns && <Row k="columns" v={tpl.columns.map((c) => c.field).join(", ")} />}
                  <Row k="size" v={`${tpl.grid.w} × ${tpl.grid.h}`} />
                </div>
                <p className="mt-3 text-[0.75rem] text-outline">It is placed in the first free spot on the page.</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 mt-4">
                <button onClick={onClose} className="h-8 px-3 text-outline hover:text-on-surface text-[0.875rem] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={addTemplate}
                  disabled={pending || !tplUsable}
                  className="btn btn-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  {pending ? "Adding…" : `Add ${tpl.title}`}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">Widget title</label>
              <input
                value={blankTitle}
                onChange={(e) => setBlankTitle(e.target.value)}
                placeholder="e.g. Paying accounts"
                className="btn"
              />
            </div>
            <div>
              <label className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">Widget type</label>
              <div className="grid grid-cols-3 gap-2 p-1 rounded-md bg-surface-container-low border border-outline-variant/30">
                {WIDGET_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setBlankType(t)}
                    className={`h-7 rounded text-[0.875rem] font-medium transition-colors ${blankType === t ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                  >
                    {WIDGET_META[t].label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[0.75rem] text-outline">{WIDGET_META[blankType].desc}</p>
            </div>
            <div>
              <label className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">Source</label>
              {sources.length === 0 ? (
                <p className="text-[0.8125rem] text-error">
                  This dashboard has no sources.{" "}
                  <a href={`/settings/sources?d=${encodeURIComponent(dashboardId)}&add=1`} className="underline font-semibold">
                    Add one first
                  </a>
                  .
                </p>
              ) : (
                <select
                  value={blankSource}
                  onChange={(e) => setBlankSource(e.target.value)}
                  className="btn"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
              <button onClick={onClose} className="h-8 px-3 text-outline hover:text-on-surface text-[0.875rem] transition-colors">
                Cancel
              </button>
              <button
                onClick={addBlank}
                disabled={pending || !blankSource}
                className="btn btn-primary"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                {pending ? "Creating…" : "Create and pick fields"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-outline w-16 shrink-0">{k}</span>
      <span className="text-on-surface break-all">{v}</span>
    </div>
  );
}
