"use client";

import { useMemo, useState } from "react";
import type { Format, TableColumn } from "@/lib/types";
import { formatValue, getPath } from "@/lib/widget-data";

interface TableWidgetProps {
  columns: TableColumn[];
  rows: unknown[];
  currency: string;
  search?: boolean;
  sortable?: boolean;
  pageSize?: number;
}

export function TableWidget({ columns, rows, currency, search, sortable, pageSize }: TableWidgetProps) {
  const fmt = (v: unknown, f?: Format) => formatValue(v, f, currency);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    if (!search || !query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) =>
      columns.some((c) => {
        const v = getPath(row, c.field).value;
        return fmt(v, c.format).toLowerCase().includes(q);
      }),
    );
  }, [rows, columns, query, search, fmt]);

  const sorted = useMemo(() => {
    if (sortCol === null || !sortable) return filtered;
    const col = columns[sortCol];
    return [...filtered].sort((a, b) => {
      const va = getPath(a, col.field).value;
      const vb = getPath(b, col.field).value;
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = fmt(va, col.format).localeCompare(fmt(vb, col.format));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, sortable, columns, fmt]);

  const activePaging = pageSize && pageSize > 0;
  const totalPages = activePaging ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const pageRows = activePaging ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

  function toggleSort(i: number) {
    if (!sortable) return;
    if (sortCol === i) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(i);
      setSortDir("asc");
    }
    setPage(0);
  }

  function handleQuery(q: string) {
    setQuery(q);
    setPage(0);
  }

  return (
    <div className="flex flex-col h-full gap-2 min-h-0">
      {search && (
        <div className="relative shrink-0">
          <span className="material-symbols-outlined text-[14px] text-outline absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            search
          </span>
          <input
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Search…"
            className="w-full h-7 pl-6 pr-6 rounded border border-outline-variant/30 bg-surface-container-lowest text-[0.75rem] text-on-surface focus:outline-none focus:border-primary"
          />
          {query && (
            <button
              onClick={() => handleQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto flex-1 min-h-0">
        <table className="w-full text-[0.875rem]">
          <thead>
            <tr className="border-b border-surface-container">
              {columns.map((c, i) => (
                <th
                  key={i}
                  onClick={() => toggleSort(i)}
                  className={[
                    "pb-2.5 text-[0.75rem] font-normal text-on-surface-variant whitespace-nowrap",
                    i === 0 ? "text-left pr-4" : "text-right pl-4",
                    sortable ? "cursor-pointer select-none hover:text-on-surface" : "",
                  ].join(" ")}
                >
                  <span className={`inline-flex items-center gap-0.5 ${i === 0 ? "" : "flex-row-reverse"}`}>
                    {c.label}
                    {sortable && sortCol === i && (
                      <span className="material-symbols-outlined text-[11px] text-primary">
                        {sortDir === "asc" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    )}
                    {sortable && sortCol !== i && (
                      <span className="material-symbols-outlined text-[11px] text-outline opacity-0 group-hover:opacity-100">
                        unfold_more
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-outline text-[0.75rem]">
                  No results
                </td>
              </tr>
            ) : (
              pageRows.map((row, r) => (
                <tr key={r} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                  {columns.map((c, i) => {
                    const v = getPath(row, c.field).value;
                    const empty = v === null || v === undefined;
                    if (i === 0) {
                      return (
                        <td key={i} className="py-2 pr-4 font-mono text-on-surface whitespace-nowrap">
                          {fmt(v, c.format)}
                        </td>
                      );
                    }
                    return (
                      <td key={i} className="py-2 pl-4 text-right font-mono tabular-nums text-on-surface whitespace-nowrap">
                        {empty ? (
                          <span className="text-outline-variant">—</span>
                        ) : c.format?.unit === "percent" && typeof v === "number" ? (
                          <span className="inline-flex items-center gap-2 w-full min-w-[140px]">
                            <span className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                              <span className="block h-full rounded-full bg-primary-container" style={{ width: `${Math.min(Math.max(v, 0), 100)}%` }} />
                            </span>
                            <span className="font-semibold w-12 text-right">{fmt(v, c.format)}</span>
                          </span>
                        ) : (
                          fmt(v, c.format)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {activePaging && (
        <div className="flex items-center justify-between pt-1 border-t border-surface-container shrink-0">
          <span className="text-[0.6875rem] text-outline tabular-nums">
            {sorted.length} row{sorted.length !== 1 ? "s" : ""}
            {totalPages > 1 && ` · page ${page + 1} / ${totalPages}`}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="w-6 h-6 flex items-center justify-center rounded text-outline hover:text-on-surface hover:bg-surface-container-high disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[14px]">first_page</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-6 h-6 flex items-center justify-center rounded text-outline hover:text-on-surface hover:bg-surface-container-high disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[14px]">chevron_left</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="w-6 h-6 flex items-center justify-center rounded text-outline hover:text-on-surface hover:bg-surface-container-high disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="w-6 h-6 flex items-center justify-center rounded text-outline hover:text-on-surface hover:bg-surface-container-high disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[14px]">last_page</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
