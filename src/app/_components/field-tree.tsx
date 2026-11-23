"use client";

import { useState } from "react";
import { typeOf } from "@/lib/widget-data";

interface FieldTreeProps {
  data: unknown;
  /** which values can be clicked; omit for a read-only tree */
  canPick?: (value: unknown) => boolean;
  onPick?: (path: string, value: unknown) => void;
  /** paths currently bound, shown highlighted */
  selected?: string[];
  filter?: string;
}

const GLYPH: Record<string, string> = { number: "#", string: "Aa", boolean: "T/F", null: "∅" };

function sample(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return `"${v.length > 22 ? v.slice(0, 22) + "…" : v}"`;
  return String(v);
}

/** true when this node or anything under it matches the search text */
function matches(path: string, value: unknown, q: string): boolean {
  if (!q || path.toLowerCase().includes(q)) return true;
  if (Array.isArray(value)) return value.length > 0 && matches(`${path}.0`, value[0], q);
  if (value && typeof value === "object") return Object.entries(value).some(([k, v]) => matches(`${path}.${k}`, v, q));
  return false;
}

export function FieldTree({ data, canPick, onPick, selected = [], filter = "" }: FieldTreeProps) {
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const q = filter.trim().toLowerCase();

  if (data === null || typeof data !== "object") {
    return <div className="px-4 py-3 text-[0.75rem] text-outline">Nothing to show.</div>;
  }

  function node(key: string, value: unknown, parent: string, depth: number): React.ReactNode {
    const path = parent ? `${parent}.${key}` : key;
    if (!matches(path, value, q)) return null;
    const t = typeOf(value);
    const container = t === "object" || t === "array";
    const pickable = Boolean(onPick && canPick?.(value));
    const isSelected = selected.includes(path);
    // objects start open, lists start closed (they show their first item); searching opens everything
    const open = q ? true : (toggled[path] ?? t === "object");
    const pad = { paddingLeft: 12 + depth * 14 };

    const rowClass = [
      "w-full flex items-center justify-between gap-2 pr-3 py-1 text-left border-l-2 transition-colors",
      isSelected ? "bg-secondary-container/40 border-primary" : "border-transparent",
      pickable ? "hover:bg-surface-container-low cursor-pointer" : "",
    ].join(" ");

    if (!container) {
      const dim = onPick && !pickable;
      return (
        <button key={path} type="button" disabled={!pickable} onClick={() => onPick?.(path, value)} className={rowClass} style={pad} title={path}>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-6 text-center font-semibold text-[10px] text-outline shrink-0">{GLYPH[t]}</span>
            <span className={`truncate ${dim ? "text-outline-variant" : "text-on-surface font-medium"}`}>{key}</span>
          </span>
          <span className={`tabular-nums shrink-0 max-w-[45%] truncate ${dim ? "text-outline-variant" : t === "number" ? "text-secondary" : "text-on-surface-variant"}`}>
            {sample(value)}
          </span>
        </button>
      );
    }

    const arr = Array.isArray(value) ? value : null;
    const children: [string, unknown][] = arr ? (arr.length ? [["0", arr[0]]] : []) : Object.entries(value as object);
    return (
      <div key={path}>
        <div className={rowClass} style={pad}>
          <button type="button" onClick={() => setToggled((p) => ({ ...p, [path]: !open }))} className="flex items-center gap-1 min-w-0 flex-1 text-left" title={path}>
            <span className={`material-symbols-outlined text-[14px] text-outline transition-transform shrink-0 ${open ? "rotate-90" : ""}`}>arrow_right</span>
            <span className={`truncate font-semibold ${onPick && !pickable ? "text-on-surface-variant" : "text-on-surface"}`}>{key}</span>
            <span className="text-[9px] text-outline uppercase tracking-wider bg-surface-container px-1 rounded shrink-0">{arr ? `list · ${arr.length}` : "object"}</span>
          </button>
          {pickable && (
            <button
              type="button"
              onClick={() => onPick?.(path, value)}
              className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-primary-container text-on-primary hover:bg-primary transition-colors"
            >
              Use
            </button>
          )}
        </div>
        {open && (
          <div>
            {arr && arr.length > 0 && (
              <div className="py-0.5 text-[10px] text-outline italic" style={{ paddingLeft: 12 + (depth + 1) * 14 }}>
                first of {arr.length}
              </div>
            )}
            {children.map(([k, v]) => node(k, v, path, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const rendered = Object.entries(data as object).map(([k, v]) => node(k, v, "", 0));
  if (rendered.every((r) => r === null)) {
    return <div className="px-4 py-3 text-[0.75rem] text-outline">No field matches “{filter}”.</div>;
  }
  return <div className="font-mono text-[0.75rem] select-none">{rendered}</div>;
}
