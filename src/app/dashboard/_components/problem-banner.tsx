"use client";
import { useState } from "react";
import Link from "next/link";
import { SyncButton } from "@/app/_components/sync-button";

export interface SourceProblem {
  id: string;
  name: string;
  /** failing: the last error. stale / never: unused */
  message?: string;
  /** when the data still on screen was fetched, already formatted */
  dataFrom?: string;
  kind: "failing" | "stale" | "never";
}

export function ProblemBanner({ problems }: { problems: SourceProblem[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = problems.filter((p) => !dismissed.includes(`${p.kind}:${p.id}`));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((p) => {
        const key = `${p.kind}:${p.id}`;
        const dismiss = () => setDismissed((d) => [...d, key]);

        if (p.kind === "failing") {
          return (
            <div key={key} className="flex items-start gap-3 p-3 rounded-[6px] bg-error-container/50 border border-error/30 text-[0.8125rem]">
              <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">error</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-error">
                  Source {p.name} can&apos;t be read: {p.message}.
                </span>
                <span className="text-on-surface-variant ml-1">{p.dataFrom ? `Showing data from ${p.dataFrom}.` : "No earlier snapshot to show."}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SyncButton
                  sourceId={p.id}
                  label="Retry"
                  iconClassName="text-[13px]"
                  className="flex items-center gap-1 text-[0.75rem] text-error font-semibold border border-error/40 rounded px-2 py-0.5 hover:bg-error/10 transition-colors"
                />
                <Link href="/sources" className="text-[0.75rem] text-error font-semibold border border-error/40 rounded px-2 py-0.5 hover:bg-error/10 transition-colors">
                  Fix source
                </Link>
                <button onClick={dismiss} aria-label="Dismiss" className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-error/10 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          );
        }

        return (
          <div key={key} className="flex items-center gap-3 p-3 rounded-[6px] bg-amber-50 border border-amber-200 text-[0.8125rem]">
            <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">{p.kind === "never" ? "cloud_off" : "schedule"}</span>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 font-mono text-[0.6875rem] text-amber-800 font-semibold">
                {p.kind === "never" ? "Not synced" : "Stale"}
              </span>
              <span className="text-amber-800">
                {p.kind === "never" ? (
                  <>
                    Source <span className="font-semibold">{p.name}</span> has no snapshot for this period yet.
                  </>
                ) : (
                  <>
                    Widgets from <span className="font-semibold">{p.name}</span> show data from {p.dataFrom}.
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <SyncButton
                sourceId={p.id}
                label={p.kind === "never" ? "Sync now" : "Force sync"}
                iconClassName="text-[13px]"
                className="flex items-center gap-1 text-[0.75rem] text-amber-700 font-semibold border border-amber-300 rounded px-2 py-0.5 hover:bg-amber-100 transition-colors"
              />
              <button onClick={dismiss} aria-label="Dismiss" className="w-6 h-6 rounded flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
