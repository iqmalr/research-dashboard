"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FieldTree } from "@/components/field-tree";
import { WidgetView } from "@/components/widgets/widget-view";
import { saveWidgetAction } from "@/lib/actions";
import { GRID_COLS, MAX_H } from "@/lib/grid";
import { PERIODS, SLOTS, UNITS, WIDGET_META, WIDGET_TYPES, type Format, type Period, type SlotKind, type SourceInfo, type TableColumn, type TableOptions, type Unit, type Widget, type WidgetType } from "@/lib/types";
import { viewProps, type SnapMap } from "@/lib/view";
import { formatValue, getPath, isNumeric, isScalar, resolveWidget } from "@/lib/widget-data";

interface WidgetEditorProps {
  dashboardId: string;
  pageId: string;
  pageName: string;
  widget: Widget;
  initialRange: Period;
  sources: SourceInfo[];
  snaps: Record<Period, SnapMap>;
  fetchedLabels: Record<string, Record<string, string>>;
}

const LIST_TYPES: WidgetType[] = ["bar", "line", "breakdown", "funnel"];
const COLUMNS = "columns";

const CAN_PICK: Record<SlotKind | typeof COLUMNS, (v: unknown) => boolean> = {
  scalar: isScalar,
  number: isNumeric,
  rows: Array.isArray,
  rowField: isScalar,
  rowNumber: isNumeric,
  columns: isScalar,
};

const SLOT_HELP: Record<SlotKind | typeof COLUMNS, string> = {
  scalar: "Pick a number or text field",
  number: "Pick a number field",
  rows: "Pick a list (press Use)",
  rowField: "Pick a field of one row",
  rowNumber: "Pick a number field of one row",
  columns: "Click fields to add them as columns",
};

const pretty = (field: string) => {
  const s = field.split(".").at(-1)!.replace(/_pct$/, " %").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const guessFormat = (field: string): Format | undefined => (field.endsWith("_pct") ? { unit: "percent", decimals: 1 } : undefined);

const inputClass =
  "w-full h-8 px-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 text-[0.8125rem] text-on-surface focus:outline-none focus:border-primary";

export function WidgetEditor({ dashboardId, pageId, pageName, widget, initialRange, sources, snaps, fetchedLabels }: WidgetEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Widget>(widget);
  const [range, setRange] = useState<Period>(initialRange);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const firstEmpty = (w: Widget) => SLOTS[w.type].find((s) => !s.optional && !w.bindings[s.key])?.key ?? (w.type === "table" ? COLUMNS : SLOTS[w.type][0].key);
  const [activeSlot, setActiveSlot] = useState<string>(() => firstEmpty(widget));

  const back = `/dashboard/edit?d=${encodeURIComponent(dashboardId)}&page=${encodeURIComponent(pageId)}&range=${range}`;
  const slots = SLOTS[draft.type];
  const source = sources.find((s) => s.id === draft.source_id);
  const data = snaps[range][draft.source_id]?.data;
  const resolved = data === undefined ? null : resolveWidget(draft, data);
  const issueFor = (slot: string) => resolved?.issues.find((i) => i.slot === slot);

  const activeKind: SlotKind | typeof COLUMNS = activeSlot === COLUMNS ? COLUMNS : (slots.find((s) => s.key === activeSlot)?.kind ?? "scalar");
  const rowMode = activeKind === "rowField" || activeKind === "rowNumber" || activeKind === COLUMNS;
  const rowsValue = draft.bindings.rows ? getPath(data, draft.bindings.rows).value : undefined;
  const rowList = Array.isArray(rowsValue) ? rowsValue : null;
  const sampleRow = rowList?.[0];

  /* ── draft updates ── */
  const patch = (p: Partial<Widget>) => setDraft((d) => ({ ...d, ...p }));
  const setBinding = (slot: string, path: string) => setDraft((d) => ({ ...d, bindings: { ...d.bindings, [slot]: path } }));
  const setColumns = (fn: (c: TableColumn[]) => TableColumn[]) => setDraft((d) => ({ ...d, columns: fn(d.columns ?? []) }));
  const setTableOptions = (p: Partial<TableOptions>) => setDraft((d) => ({ ...d, tableOptions: { ...d.tableOptions, ...p } }));
  const setGrid = (k: keyof Widget["grid"], v: number) => setDraft((d) => ({ ...d, grid: { ...d.grid, [k]: Number.isFinite(v) ? v : 0 } }));

  function pick(path: string) {
    if (activeSlot === COLUMNS) {
      setColumns((c) => (c.some((x) => x.field === path) ? c : [...c, { label: pretty(path), field: path, format: guessFormat(path) }]));
      return;
    }
    const next = { ...draft, bindings: { ...draft.bindings, [activeSlot]: path } };
    setDraft(next);
    setFilter("");
    // move on to the next slot that still needs a field
    const empty = SLOTS[next.type].find((s) => !s.optional && !next.bindings[s.key]);
    if (empty) setActiveSlot(empty.key);
    else if (next.type === "table" && (next.columns ?? []).length === 0) setActiveSlot(COLUMNS);
  }

  function changeType(type: WidgetType) {
    if (type === draft.type) return;
    const b = draft.bindings;
    const bindings: Record<string, string> = {};
    const fromList = LIST_TYPES.includes(draft.type);
    if (type !== "stat" && b.rows) bindings.rows = b.rows;
    if (LIST_TYPES.includes(type) && fromList) {
      // bar/line use x,y; breakdown/funnel use label,value: same fields, different names
      const [k1, k2] = type === "bar" || type === "line" ? ["x", "y"] : ["label", "value"];
      const v1 = b.x ?? b.label;
      const v2 = b.y ?? b.value;
      if (v1) bindings[k1] = v1;
      if (v2) bindings[k2] = v2;
    }
    const oldMain = SLOTS[draft.type].find((s) => s.formattable)?.key;
    const newMain = SLOTS[type].find((s) => s.formattable)?.key;
    const f = oldMain ? draft.format?.[oldMain] : undefined;
    const next: Widget = {
      ...draft,
      type,
      bindings,
      format: f && newMain && fromList === LIST_TYPES.includes(type) ? { [newMain]: f } : undefined,
      columns: type === "table" ? (draft.columns ?? []) : undefined,
    };
    setDraft(next);
    setActiveSlot(firstEmpty(next));
  }

  function setFormat(slot: string, f: Format | undefined) {
    setDraft((d) => {
      const format = { ...(d.format ?? {}) };
      if (f) format[slot] = f;
      else delete format[slot];
      return { ...d, format };
    });
  }

  function apply() {
    setError(null);
    start(async () => {
      const r = await saveWidgetAction(dashboardId, pageId, draft);
      if (!r.ok) return setError(r.error);
      router.push(back);
    });
  }

  /* ── left panel content ── */
  const treeData = rowMode ? sampleRow : data;
  const selectedPaths = rowMode
    ? draft.type === "table"
      ? (draft.columns ?? []).map((c) => c.field)
      : slots.filter((s) => s.kind !== "rows").map((s) => draft.bindings[s.key]).filter(Boolean)
    : [draft.bindings.value, draft.bindings.delta, draft.bindings.rows].filter(Boolean);

  const mainSlot = slots.find((s) => s.formattable);
  const mainFormat = mainSlot ? draft.format?.[mainSlot.key] : undefined;

  return (
    <div className="flex w-full h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* LEFT: response field tree */}
      <aside className="w-[340px] shrink-0 bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col">
        <div className="px-4 py-3 border-b border-outline-variant/20">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.125rem] font-semibold text-on-surface">Response</h2>
            <span className="px-2 py-0.5 rounded bg-surface-container-low border border-outline-variant/30 font-mono text-[0.75rem] text-on-surface-variant truncate">{source?.name ?? "no source"}</span>
          </div>
          <p className="mt-0.5 text-[0.75rem] text-outline">
            {data === undefined ? "No snapshot for this period" : `Snapshot from ${fetchedLabels[range]?.[draft.source_id] ?? "—"} · ${range}`}
          </p>

          {/* Where the tree is rooted */}
          <div className="mt-2 flex items-center gap-1.5 py-1 px-2.5 rounded bg-surface-container-low border border-outline-variant/30 font-mono text-[0.75rem] min-w-0">
            {rowMode ? (
              <>
                <button onClick={() => setActiveSlot("rows")} className="flex items-center gap-1 text-primary hover:underline shrink-0">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  All fields
                </button>
                <span className="text-outline">/</span>
                <span className="font-medium text-on-surface truncate">{draft.bindings.rows || "rows"}</span>
                {rowList && <span className="text-outline shrink-0 ml-auto">[{rowList.length}]</span>}
              </>
            ) : (
              <span className="text-on-surface-variant">All fields</span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-[0.75rem] text-primary font-medium">
            <span className="material-symbols-outlined text-[14px]">ads_click</span>
            <span>
              Filling <span className="font-mono font-semibold">{activeSlot}</span>: {SLOT_HELP[activeKind].toLowerCase()}
            </span>
          </div>

          <div className="mt-2 relative">
            <span className="material-symbols-outlined text-[16px] text-outline absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search fields..." className={`${inputClass} pl-8`} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {data === undefined ? (
            <Hint icon="cloud_off" text={source ? "This source has no snapshot for this period. Sync it on the Sources page, or type the paths by hand." : "Pick a source first."} />
          ) : rowMode && !rowList ? (
            <Hint icon="format_list_bulleted" text="Pick the Rows list first. Its fields then show up here." action={<button onClick={() => setActiveSlot("rows")} className="text-primary font-semibold hover:underline">Pick rows</button>} />
          ) : rowMode && rowList!.length === 0 ? (
            <Hint icon="inbox" text="This list is empty in the current snapshot, so there is no sample row. Try another period or type the field name." />
          ) : (
            <FieldTree data={treeData} canPick={CAN_PICK[activeKind]} onPick={pick} selected={selectedPaths} filter={filter} />
          )}
        </div>
      </aside>

      {/* CENTER: live preview */}
      <section className="flex-1 min-w-0 bg-surface flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={back} className="w-7 h-7 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors shrink-0">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </Link>
            <div className="min-w-0 truncate">
              <span className="text-[0.6875rem] font-semibold text-outline uppercase tracking-wider">Preview</span>
              <span className="text-[0.75rem] text-outline ml-2 font-mono">
                {pageName} · {draft.grid.w} × {draft.grid.h}
              </span>
            </div>
          </div>
          {/* same snapshot the dashboard would use, per period */}
          <div className="inline-flex items-center bg-surface-container-low p-0.5 rounded-[6px] border border-outline-variant/30 text-[0.75rem] font-medium shrink-0">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setRange(p)} className={["px-2.5 py-1 rounded transition-colors", range === p ? "bg-primary-container text-on-primary font-semibold" : "text-outline hover:text-on-surface"].join(" ")}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="[&>*]:h-full" style={{ width: `max(260px, ${(draft.grid.w / GRID_COLS) * 100}%)`, maxWidth: "100%", minHeight: draft.grid.h * 132 + (draft.grid.h - 1) * 16 }}>
            <WidgetView widget={draft} {...viewProps(draft, sources, snaps[range])} />
          </div>

          {resolved && resolved.issues.length > 0 && (
            <div className="w-full max-w-[620px] text-[0.75rem] text-on-surface-variant flex items-center gap-1.5 justify-center">
              <span className="material-symbols-outlined text-[14px] text-outline">info</span>
              {resolved.issues.length} slot{resolved.issues.length === 1 ? "" : "s"} still need attention
            </div>
          )}

          {sampleRow !== undefined && draft.type !== "stat" && (
            <details className="w-full max-w-[620px] bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden" open>
              <summary className="px-4 py-2.5 cursor-pointer text-[0.75rem] font-medium text-on-surface-variant hover:bg-surface-container-low">
                Sample row ({draft.bindings.rows}.0)
              </summary>
              <pre className="px-4 pb-3 pt-2 border-t border-surface-container font-mono text-[0.75rem] text-on-surface overflow-x-auto">{JSON.stringify(sampleRow, null, 2)}</pre>
            </details>
          )}
        </div>
      </section>

      {/* RIGHT: widget inspector */}
      <aside className="w-[340px] shrink-0 bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col">
        <div className="px-4 py-3 border-b border-outline-variant/20">
          <h2 className="text-[1.125rem] font-semibold text-on-surface">Widget</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <Label>Title</Label>
            <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} className={inputClass} />
          </div>

          <div>
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded bg-surface-container-low border border-outline-variant/30">
              {WIDGET_TYPES.map((t) => (
                <button key={t} onClick={() => changeType(t)} className={`h-7 rounded text-[0.8125rem] font-medium transition-colors ${draft.type === t ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                  {WIDGET_META[t].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Source</Label>
            <select value={source ? draft.source_id : ""} onChange={(e) => patch({ source_id: e.target.value })} className={`${inputClass} font-mono`}>
              {!source && <option value="">(removed source)</option>}
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Slots */}
          <div className="space-y-3">
            <Label>Fields</Label>
            {slots.map((s) => {
              const issue = issueFor(s.key);
              const active = activeSlot === s.key;
              const path = draft.bindings[s.key] ?? "";
              const real = issue && issue.kind !== "unbound";
              let hint: string | null = null;
              if (!issue && path && data !== undefined) {
                if (s.kind === "rows") hint = `${rowList?.length ?? 0} rows`;
                else if (s.kind === "scalar" || s.kind === "number") hint = `= ${formatValue(getPath(data, path).value, undefined)}`;
                else if (sampleRow !== undefined) hint = `e.g. ${formatValue(getPath(sampleRow, path).value, undefined)}`;
              }
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[0.8125rem] font-medium ${real ? "text-error" : "text-on-surface"}`}>
                      {s.label}
                      {s.optional && <span className="text-outline font-normal"> · optional</span>}
                    </span>
                    {active && <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">picking</span>}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      value={path}
                      onFocus={() => setActiveSlot(s.key)}
                      onChange={(e) => setBinding(s.key, e.target.value.trim())}
                      placeholder={SLOT_HELP[s.kind]}
                      spellCheck={false}
                      className={[
                        "w-full h-8 pl-3 pr-8 rounded bg-surface-container-lowest border font-mono text-[0.75rem] text-on-surface focus:outline-none placeholder:font-sans placeholder:text-outline",
                        real ? "border-error" : active ? "border-primary ring-1 ring-primary" : "border-outline-variant/30",
                      ].join(" ")}
                    />
                    {path && (
                      <button onClick={() => { setBinding(s.key, ""); setActiveSlot(s.key); }} aria-label={`Clear ${s.label}`} className="absolute right-1.5 w-5 h-5 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-low">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                  {real ? (
                    <div className="mt-1 flex items-start gap-1 text-error text-[0.75rem]">
                      <span className="material-symbols-outlined text-[14px] shrink-0 mt-px">error</span>
                      <span>{issue.message}</span>
                    </div>
                  ) : hint ? (
                    <div className="mt-1 font-mono text-[11px] text-outline truncate">{hint}</div>
                  ) : null}
                </div>
              );
            })}

            {draft.type === "table" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.8125rem] font-medium text-on-surface">Columns</span>
                  <button onClick={() => setActiveSlot(COLUMNS)} className={`text-[10px] font-semibold uppercase tracking-wide ${activeSlot === COLUMNS ? "text-primary" : "text-outline hover:text-primary"}`}>
                    {activeSlot === COLUMNS ? "picking" : "+ pick from fields"}
                  </button>
                </div>
                <div className={`space-y-1.5 p-1.5 rounded border ${activeSlot === COLUMNS ? "border-primary ring-1 ring-primary" : "border-outline-variant/30"}`}>
                  {(draft.columns ?? []).length === 0 && <div className="px-1.5 py-1 text-[0.75rem] text-outline">No columns yet. Click fields on the left.</div>}
                  {(draft.columns ?? []).map((c, i) => {
                    const issue = issueFor(`columns.${i}`);
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-1">
                          <input value={c.label} onChange={(e) => setColumns((cs) => cs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Column label" className="w-0 flex-[3] h-7 px-2 rounded border border-outline-variant/30 text-[0.75rem] text-on-surface focus:outline-none focus:border-primary" />
                          <input value={c.field} onChange={(e) => setColumns((cs) => cs.map((x, j) => (j === i ? { ...x, field: e.target.value.trim() } : x)))} aria-label="Column field" spellCheck={false} className={`w-0 flex-[3] h-7 px-2 rounded border font-mono text-[0.6875rem] text-on-surface focus:outline-none focus:border-primary ${issue ? "border-error" : "border-outline-variant/30"}`} />
                          <select value={c.format?.unit ?? ""} onChange={(e) => setColumns((cs) => cs.map((x, j) => (j === i ? { ...x, format: e.target.value ? { unit: e.target.value as Unit, decimals: e.target.value === "percent" ? 1 : undefined } : undefined } : x)))} aria-label="Column unit" className="w-0 flex-[2] h-7 px-1 rounded border border-outline-variant/30 text-[0.6875rem] text-on-surface focus:outline-none">
                            <option value="">auto</option>
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                          <button onClick={() => i > 0 && setColumns((cs) => cs.map((x, j) => (j === i - 1 ? cs[i] : j === i ? cs[i - 1] : x)))} disabled={i === 0} aria-label="Move column up" className="w-5 h-7 flex items-center justify-center text-outline hover:text-on-surface disabled:opacity-30">
                            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                          </button>
                          <button onClick={() => setColumns((cs) => cs.filter((_, j) => j !== i))} aria-label="Remove column" className="w-5 h-7 flex items-center justify-center text-outline hover:text-error">
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                        {issue && <div className="mt-0.5 text-error text-[0.6875rem]">{issue.message}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Table options */}
          {draft.type === "table" && (
            <div className="space-y-2.5">
              <Label>Table options</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!draft.tableOptions?.search}
                  onChange={(e) => setTableOptions({ search: e.target.checked || undefined })}
                  className="rounded accent-primary"
                />
                <span className="text-[0.8125rem] text-on-surface">Search bar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!draft.tableOptions?.sortable}
                  onChange={(e) => setTableOptions({ sortable: e.target.checked || undefined })}
                  className="rounded accent-primary"
                />
                <span className="text-[0.8125rem] text-on-surface">Sortable columns</span>
              </label>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                  <input
                    type="checkbox"
                    checked={!!draft.tableOptions?.pageSize}
                    onChange={(e) => setTableOptions({ pageSize: e.target.checked ? 10 : undefined })}
                    className="rounded accent-primary"
                  />
                  <span className="text-[0.8125rem] text-on-surface">Pagination</span>
                </label>
                {!!draft.tableOptions?.pageSize && (
                  <select
                    value={draft.tableOptions.pageSize}
                    onChange={(e) => setTableOptions({ pageSize: Number(e.target.value) })}
                    className={inputClass}
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n} rows per page
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Format of the main value */}
          {mainSlot && (
            <div className="space-y-2">
              <Label>Format · {mainSlot.label}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[0.75rem] text-outline block mb-1">Unit</span>
                  <select value={mainFormat?.unit ?? ""} onChange={(e) => setFormat(mainSlot.key, e.target.value ? { unit: e.target.value as Unit, decimals: mainFormat?.decimals } : undefined)} className={inputClass}>
                    <option value="">Auto</option>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[0.75rem] text-outline block mb-1">Decimals</span>
                  <div className={`flex items-center h-8 rounded border border-outline-variant/30 bg-surface-container-lowest overflow-hidden ${mainFormat ? "" : "opacity-50"}`}>
                    <button disabled={!mainFormat} onClick={() => setFormat(mainSlot.key, { ...mainFormat!, decimals: Math.max(0, (mainFormat!.decimals ?? 0) - 1) })} className="w-7 h-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low border-r border-outline-variant/30">
                      -
                    </button>
                    <span className="flex-1 text-center font-mono text-[0.8125rem] text-on-surface tabular-nums">{mainFormat?.decimals ?? "auto"}</span>
                    <button disabled={!mainFormat} onClick={() => setFormat(mainSlot.key, { ...mainFormat!, decimals: Math.min(4, (mainFormat!.decimals ?? 0) + 1) })} className="w-7 h-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low border-l border-outline-variant/30">
                      +
                    </button>
                  </div>
                </div>
              </div>
              {mainFormat?.unit === "currency" && <p className="text-[0.6875rem] text-outline">Money is read in the smallest unit (cents) with the currency from meta.currency.</p>}
            </div>
          )}

          {/* Layout */}
          <div className="space-y-2">
            <Label>Layout · 12 columns</Label>
            <div className="grid grid-cols-4 gap-2">
              <NumberField label="Column" min={1} max={GRID_COLS} value={draft.grid.x + 1} onChange={(v) => setGrid("x", v - 1)} />
              <NumberField label="Row" min={1} max={99} value={draft.grid.y + 1} onChange={(v) => setGrid("y", v - 1)} />
              <NumberField label="Width" min={1} max={GRID_COLS} value={draft.grid.w} onChange={(v) => setGrid("w", v)} />
              <NumberField label="Height" min={1} max={MAX_H} value={draft.grid.h} onChange={(v) => setGrid("h", v)} />
            </div>
            <p className="text-[0.6875rem] text-outline">Widgets in the way are pushed down, and empty rows close up.</p>
          </div>
        </div>

        <div className="p-4 border-t border-outline-variant/20">
          {error && <div className="mb-2 text-[0.75rem] text-error">{error}</div>}
          <div className="flex items-center justify-between">
            <Link href={back} className="h-8 px-3 flex items-center text-outline hover:text-on-surface text-[0.875rem] transition-colors">
              Cancel
            </Link>
            <button onClick={apply} disabled={pending} className="h-8 px-4 bg-primary-container hover:bg-primary text-on-primary rounded text-[0.875rem] font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60">
              <span className="material-symbols-outlined text-[16px]">check</span>
              {pending ? "Saving…" : "Apply changes"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">{children}</label>;
}

function Hint({ icon, text, action }: { icon: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="mx-4 mt-2 p-3 rounded bg-surface-container-low border border-outline-variant/30 text-[0.75rem] text-on-surface-variant space-y-1.5">
      <span className="material-symbols-outlined text-[18px] text-outline block">{icon}</span>
      <p className="leading-snug">{text}</p>
      {action}
    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <span className="text-[0.75rem] text-outline block mb-1">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))))}
        className="w-full h-8 px-2 rounded bg-surface-container-lowest border border-outline-variant/30 font-mono text-[0.8125rem] text-on-surface tabular-nums focus:outline-none focus:border-primary"
      />
    </div>
  );
}
