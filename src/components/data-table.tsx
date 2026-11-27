"use client";

import { Fragment, useMemo, useState } from "react";
import type { Format, TableColumn } from "@/lib/types";
import { formatValue, getPath } from "@/lib/widget-data";

interface Props {
  title: string;
  columns: TableColumn[];
  rows: unknown[];
  currency: string;
  search?: boolean;
  sortable?: boolean;
  pageSize?: number;
}

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function DataTable({ title, columns, rows, currency, search, sortable, pageSize = 25 }: Props) {
  const fmt = (v: unknown, f?: Format) => formatValue(v, f, currency);
  const visible = columns.filter((c) => !c.detail);
  const detail = columns.filter((c) => c.detail);
  const filters = columns.filter((c) => c.filter);

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ col: TableColumn; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  const options = useMemo(
    () => Object.fromEntries(filters.map((c) => [c.field, [...new Set(rows.map((r) => text(getPath(r, c.field).value)))].filter(Boolean).sort()])),
    [filters, rows],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => filters.every((c) => !picked[c.field] || text(getPath(r, c.field).value) === picked[c.field]));
    if (q) out = out.filter((r) => visible.some((c) => text(getPath(r, c.field).value).toLowerCase().includes(q) || (c.sub && text(getPath(r, c.sub).value).toLowerCase().includes(q))));
    if (sort) {
      const { col, dir } = sort;
      out = [...out].sort((a, b) => {
        const va = getPath(a, col.field).value;
        const vb = getPath(b, col.field).value;
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : text(va).localeCompare(text(vb));
        return dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, filters, picked, query, sort, visible]);

  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const slice = shown.slice(cur * pageSize, (cur + 1) * pageSize);

  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [columns.map((c) => esc(c.label)).join(","), ...shown.map((r) => columns.map((c) => esc(fmt(getPath(r, c.field).value, c.format))).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${title.toLowerCase().replace(/\W+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pageList = (): (number | "…")[] => {
    if (pages <= 6) return Array.from({ length: pages }, (_, i) => i);
    return [0, 1, 2, "…", pages - 1].filter((p, i, a) => !(p === "…" && a[i - 1] === "…")) as (number | "…")[];
  };

  const cell = (c: TableColumn, row: unknown) => {
    const v = getPath(row, c.field).value;
    const s = fmt(v, c.format);
    if (c.display === "user")
      return (
        <div className="min-w-0">
          <div className="font-medium text-on-surface truncate">{s}</div>
          {c.sub && getPath(row, c.sub).value ? <div className="text-[0.6875rem] text-outline truncate">{text(getPath(row, c.sub).value)}</div> : null}
        </div>
      );
    if (c.display === "chip") return <span className="inline-block rounded-md bg-[#dde8fd] text-[#2563eb] px-2 py-0.5 text-[0.6875rem] font-medium">{s}</span>;
    if (c.display === "login")
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/50 px-2 py-0.5 text-[0.6875rem] text-on-surface-variant">
          <b className="font-semibold">{s === "Google" ? "G" : "@"}</b>
          {s}
        </span>
      );
    if (c.display === "status") {
      const l = s.toLowerCase();
      const tone = l.includes("deliver") ? "bg-emerald-50 text-emerald-700" : l.includes("fail") ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
      return s ? <span className={`inline-block rounded-md px-2 py-0.5 text-[0.6875rem] ${tone}`}>{s}</span> : null;
    }
    if (c.display === "primary") return <span className="font-medium text-on-surface">{s}</span>;
    if (c.display === "muted") return <span className="text-outline">{s}</span>;
    return s;
  };

  const th = "py-2 pr-3 text-left text-[0.75rem] font-normal text-outline whitespace-nowrap";
  const control = "h-8 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-2.5 text-[0.75rem] text-on-surface";

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[0.9375rem] font-medium">{title}</h3>
          <span className="rounded-full bg-surface-container px-2 py-0.5 text-[0.6875rem] tabular-nums text-on-surface-variant">{rows.length}</span>
        </div>
        <button type="button" onClick={exportCsv} className="h-8 rounded-lg border border-outline-variant/50 px-3 text-[0.75rem] hover:bg-surface-container">
          Export CSV
        </button>
      </div>

      <div className="px-5 pb-3 flex flex-wrap gap-2">
        {search && (
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search name or email"
            className={`${control} w-60`}
          />
        )}
        {filters.map((c) => (
          <select key={c.field} value={picked[c.field] ?? ""} onChange={(e) => { setPicked({ ...picked, [c.field]: e.target.value }); setPage(0); }} className={control}>
            <option value="">All {c.label.toLowerCase()}s</option>
            {options[c.field].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      <div className="px-5 overflow-x-auto">
        <table className="w-full text-[0.8125rem] border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/30">
              <th className="w-5" />
              {visible.map((c, i) => (
                <th key={i} className={`${th} ${c.display === "number" ? "text-right pr-0" : ""}`}>
                  <button
                    type="button"
                    disabled={!sortable}
                    onClick={() => { setSort(sort?.col === c ? { col: c, dir: sort.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "asc" }); setPage(0); }}
                    className={sort?.col === c ? "text-on-surface font-medium" : ""}
                  >
                    {c.label} <span className="text-[0.625rem]">{sort?.col === c ? (sort.dir === "asc" ? "↑" : "↓") : sortable ? "↕" : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, r) => {
              const idx = cur * pageSize + r;
              const isOpen = open === idx;
              return (
                <Fragment key={idx}>
                  <tr className={`border-b border-outline-variant/20 hover:bg-surface-container-low cursor-pointer ${isOpen ? "bg-surface-container-low" : ""}`} onClick={() => setOpen(isOpen ? null : idx)}>
                    <td className="text-outline text-[0.625rem] py-3">{detail.length ? (isOpen ? "⌄" : "›") : ""}</td>
                    {visible.map((c, i) => (
                      <td key={i} className={`py-3 pr-3 whitespace-nowrap ${c.display === "number" ? "text-right pr-0 tabular-nums" : ""} ${c.display ? "" : "text-on-surface-variant"}`}>
                        {cell(c, row)}
                      </td>
                    ))}
                  </tr>
                  {isOpen && detail.length > 0 && (
                    <tr className="bg-surface-container-low">
                      <td />
                      <td colSpan={visible.length} className="pb-4 pr-3">
                        <dl className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-6 gap-y-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 p-4">
                          {detail.map((c, i) => (
                            <div key={i}>
                              <dt className="text-[0.6875rem] text-outline">{c.label}</dt>
                              <dd className="text-[0.8125rem] text-on-surface">{fmt(getPath(row, c.field).value, c.format) || "-"}</dd>
                            </div>
                          ))}
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {slice.length === 0 && (
              <tr><td colSpan={visible.length + 1} className="py-8 text-center text-outline">No matching rows</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-4 flex items-center justify-between text-[0.75rem] text-outline">
        <span className="tabular-nums">{shown.length ? `${cur * pageSize + 1}-${Math.min((cur + 1) * pageSize, shown.length)} of ${shown.length}` : "0 results"}</span>
        <div className="flex items-center gap-1">
          <button type="button" disabled={cur === 0} onClick={() => setPage(cur - 1)} className="px-2 disabled:opacity-40">Prev</button>
          {pageList().map((p, i) =>
            p === "…" ? <span key={i}>…</span> : (
              <button key={i} type="button" onClick={() => setPage(p)} className={`h-7 min-w-7 rounded-md border px-2 tabular-nums ${p === cur ? "bg-on-surface text-surface-container-lowest border-transparent" : "border-outline-variant/50 text-on-surface"}`}>
                {p + 1}
              </button>
            ),
          )}
          <button type="button" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="px-2 border border-outline-variant/50 rounded-md h-7 disabled:opacity-40 text-on-surface">Next</button>
        </div>
      </div>
    </div>
  );
}
