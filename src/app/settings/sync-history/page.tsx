import { Suspense } from "react";
import { loadStore } from "@/lib/store";
import { shortDateTime } from "@/lib/time";

const kb = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

export default function SyncHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[0.8125rem] text-outline font-mono">Loading sync history…</div>}>
      <SyncHistoryView />
    </Suspense>
  );
}

async function SyncHistoryView() {
  const { store } = await loadStore();
  const runs = store.runs;
  const failed = runs.filter((r) => r.status === "failed").length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="pb-4 border-b border-outline-variant/30">
        <h1 className="text-[2.125rem] leading-tight font-normal tracking-[-0.02em] text-on-surface">Sync history</h1>
        <p className="text-[0.8125rem] text-on-surface-variant mt-0.5">
          <span className="font-mono font-medium text-on-surface">{runs.length} calls</span> · one per source and period ·{" "}
          <span className={failed ? "text-error font-medium" : ""}>{failed} failed</span>
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-[0.8125rem]">
          <thead>
            <tr className="border-b border-surface-container">
              <th className="text-left p-3 font-semibold text-on-surface-variant">Run ID</th>
              <th className="text-left p-3 font-semibold text-on-surface-variant">Source</th>
              <th className="text-left p-3 font-semibold text-on-surface-variant">Period</th>
              <th className="text-left p-3 font-semibold text-on-surface-variant">Status</th>
              <th className="text-right p-3 font-semibold text-on-surface-variant">HTTP</th>
              <th className="text-right p-3 font-semibold text-on-surface-variant">Duration</th>
              <th className="text-right p-3 font-semibold text-on-surface-variant">Size</th>
              <th className="text-right p-3 font-semibold text-on-surface-variant">Started at</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-outline">
                  Nothing has been synced yet. Use “Sync all” in the header.
                </td>
              </tr>
            )}
            {runs.map((r) => {
              const ok = r.status === "success";
              return (
                <tr key={r.id} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                  <td className="p-3 font-mono text-[0.75rem] text-on-surface-variant">{r.id}</td>
                  <td className="p-3 font-mono font-medium text-on-surface">{r.sourceName}</td>
                  <td className="p-3 font-mono text-[0.75rem] text-on-surface-variant">{r.period}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ok ? "bg-emerald-500" : "bg-error"}`} />
                      <span className={`font-medium ${ok ? "text-emerald-700" : "text-error"}`}>{ok ? "success" : r.error}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono text-[0.75rem] text-on-surface">{r.httpStatus ?? <span className="text-outline">—</span>}</td>
                  <td className="p-3 text-right font-mono text-[0.75rem] text-on-surface tabular-nums">{r.durationMs} ms</td>
                  <td className="p-3 text-right font-mono tabular-nums text-on-surface">{r.bytes > 0 ? kb(r.bytes) : <span className="text-outline">—</span>}</td>
                  <td className="p-3 text-right font-mono text-[0.75rem] text-outline">{shortDateTime(r.at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
