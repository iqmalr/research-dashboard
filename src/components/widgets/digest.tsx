"use client";
import { useState } from "react";

/** Big total + first rows, "Show all" expands. */
export function Digest({ items }: { items: { label: string; text: string }[] }) {
  const [all, setAll] = useState(false);
  const rows = all ? items : items.slice(0, 5);
  return (
    <div className="flex flex-col h-full">
      <div className="text-[2.5rem] leading-none font-light tabular-nums">{items.length}</div>
      <div className="mb-2" />
      <div className="divide-y divide-outline-variant/30 overflow-y-auto">
        {rows.map((it, i) => (
          <div key={i} className="flex justify-between gap-3 py-1.5 text-[0.75rem]">
            <span className="truncate text-on-surface">{it.label}</span>
            <span className="font-mono text-on-surface-variant tabular-nums shrink-0">{it.text}</span>
          </div>
        ))}
      </div>
      {items.length > 5 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-2 w-full rounded-md border border-outline-variant/40 py-1.5 text-[0.75rem] hover:bg-surface-container">
          {all ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

