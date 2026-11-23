"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SyncButton } from "@/app/_components/sync-button";
import { deleteSourceAction } from "@/lib/actions";
import { CONNECTOR_GROUPS, CONNECTORS, DEMO_HINT, kindLabel, type ConnectorDef } from "@/lib/connectors/catalog";
import { PERIODS, type SourceInfo, type SourceKind } from "@/lib/types";
import { AddSourceModal } from "./add-source-modal";

export interface SourceRow extends SourceInfo {
  dashboardName: string;
  /** how many of the four periods have a snapshot */
  periods: number;
  widgets: number;
  lastSyncLabel: string;
  dataLabel: string;
}

const STATUS = {
  ok: { dot: "bg-emerald-500", text: "text-emerald-700", label: "healthy" },
  error: { dot: "bg-error", text: "text-error", label: "failing" },
  never: { dot: "bg-warn", text: "text-warn", label: "not synced" },
} as const;

interface SourcesClientProps {
  rows: SourceRow[];
  dashboards: { id: string; name: string }[];
  /** dashboard id from ?d=, or "" for all */
  filter: string;
  /** open the add modal straight away (?add=1) */
  openAdd: boolean;
  mockHint: string;
}

export function SourcesClient({ rows: allRows, dashboards, filter, openAdd, mockHint }: SourcesClientProps) {
  const rows = filter ? allRows.filter((r) => r.dashboardId === filter) : allRows;
  // null = closed, a kind = add a source of that kind, otherwise the source being edited
  const [modal, setModal] = useState<null | SourceKind | SourceRow>(openAdd ? "endpoint" : null);
  const [, start] = useTransition();
  const router = useRouter();

  function closeModal() {
    setModal(null);
    // drop ?add=1 so a reload does not reopen the form
    if (openAdd) router.replace(filter ? `/sources?d=${encodeURIComponent(filter)}` : "/sources");
  }

  function remove(s: SourceRow) {
    const note = s.widgets > 0 ? ` ${s.widgets} widget(s) use it and will show “Source removed”.` : "";
    if (!window.confirm(`Delete source “${s.name}” and its snapshots?${note}`)) return;
    start(async () => void (await deleteSourceAction(s.id)));
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {modal && (
        <AddSourceModal
          key={typeof modal === "string" ? modal : modal.id}
          kind={typeof modal === "string" ? modal : modal.kind}
          editing={typeof modal === "string" ? undefined : modal}
          dashboards={dashboards}
          defaultDashboardId={filter || dashboards[0].id}
          mockHint={mockHint}
          onClose={closeModal}
        />
      )}

      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
        <div>
          <h1 className="text-[1.5rem] leading-8 font-semibold tracking-[-0.02em] text-on-surface">Sources</h1>
          <p className="text-[0.8125rem] text-on-surface-variant mt-0.5">
            <span className="font-mono font-medium text-on-surface">
              {rows.length} source{rows.length === 1 ? "" : "s"}
            </span>{" "}
            · JSON endpoints and connected services, stored as one snapshot per period ({PERIODS.join(", ")})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton
            dashboardId={filter || undefined}
            label={filter ? "Sync these" : "Sync all"}
            className="flex items-center gap-1.5 px-3 h-8 rounded-[6px] bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 text-on-surface text-[0.875rem] font-medium transition-colors"
          />
          <button onClick={() => setModal("endpoint")} className="flex items-center gap-1.5 bg-primary-container hover:bg-primary text-on-primary px-3.5 py-1.5 h-8 rounded-[6px] text-[0.875rem] font-medium transition-colors">
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add endpoint</span>
          </button>
        </div>
      </div>

      {/* Sources belong to a dashboard: filter by it */}
      <div className="flex items-center gap-1.5 flex-wrap text-[0.75rem]">
        <span className="text-outline mr-1">Dashboard</span>
        {[{ id: "", name: "All" }, ...dashboards].map((d) => (
          <Link
            key={d.id}
            href={d.id ? `/sources?d=${encodeURIComponent(d.id)}` : "/sources"}
            className={["px-2.5 py-1 rounded-[6px] border font-medium transition-colors", filter === d.id ? "bg-primary-container text-on-primary border-primary-container" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:text-on-surface"].join(" ")}
          >
            {d.name}
          </Link>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-[8px] overflow-hidden">
        <table className="w-full text-[0.8125rem]">
          <thead>
            <tr className="border-b border-surface-container">
              <th className="text-left p-3 font-semibold text-on-surface-variant">Source</th>
              <th className="text-left p-3 font-semibold text-on-surface-variant">Dashboard</th>
              <th className="text-left p-3 font-semibold text-on-surface-variant">Reads from</th>
              <th className="text-left p-3 font-semibold text-on-surface-variant">Status</th>
              <th className="text-right p-3 font-semibold text-on-surface-variant">Snapshots</th>
              <th className="text-right p-3 font-semibold text-on-surface-variant">Widgets</th>
              <th className="text-right p-3 font-semibold text-on-surface-variant">Last attempt</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-outline">
                  {filter ? "This dashboard has no sources yet." : "No sources yet."} Add a stats endpoint or connect a service below to start building widgets.
                </td>
              </tr>
            )}
            {rows.map((s) => {
              const st = STATUS[s.status];
              return (
                <tr key={s.id} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors align-top">
                  <td className="p-3 font-mono font-medium text-on-surface whitespace-nowrap">{s.name}</td>
                  <td className="p-3 text-on-surface-variant whitespace-nowrap">
                    <Link href={`/dashboard?d=${encodeURIComponent(s.dashboardId)}`} className="hover:text-primary hover:underline">
                      {s.dashboardName}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-[0.75rem] text-on-surface-variant break-all max-w-[420px]">
                    {s.kind === "endpoint" ? (
                      <>
                        {s.url}
                        <div className="text-outline mt-0.5">key {s.keyHint || "not set"}</div>
                      </>
                    ) : (
                      <>
                        <span className="font-sans font-medium text-on-surface">{kindLabel(s.kind)}</span>
                        {s.keyHint === DEMO_HINT ? <TestBadge /> : <div className="text-outline mt-0.5">{s.keyHint}</div>}
                      </>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                      <span className={`font-medium ${st.text}`}>{st.label}</span>
                    </div>
                    {s.status === "error" && s.lastError && <div className="text-[0.75rem] text-error mt-0.5">{s.lastError.message}</div>}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-on-surface whitespace-nowrap">
                    {s.periods}/{PERIODS.length}
                    <div className="text-[0.75rem] text-outline">{s.dataLabel}</div>
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-on-surface">{s.widgets}</td>
                  <td className="p-3 text-right font-mono text-[0.75rem] text-outline whitespace-nowrap">{s.lastSyncLabel}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <SyncButton sourceId={s.id} label="" className="text-outline hover:text-primary p-1 rounded transition-colors flex" iconClassName="text-[18px]" />
                      <button onClick={() => setModal(s)} title="Edit" className="text-outline hover:text-on-surface p-1 rounded transition-colors flex">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => remove(s)} title="Delete" className="text-outline hover:text-error p-1 rounded transition-colors flex">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Third-party services: the same sources, set up from a catalogue instead of a URL */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-[8px] p-5">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="text-[1rem] font-semibold text-on-surface">Connect a service</h2>
          <span className="text-[0.75rem] text-outline">Read-only credentials, encrypted and kept per dashboard</span>
        </div>
        {CONNECTOR_GROUPS.map((group) => (
          <div key={group} className="mt-4">
            <div className="text-[0.75rem] text-outline pb-2 border-b border-outline-variant/30">{group}</div>
            {CONNECTORS.filter((c) => c.group === group).map((c) => (
              <ConnectorRow key={c.kind} def={c} connected={rows.filter((r) => r.kind === c.kind)} scoped={Boolean(filter)} onConnect={() => setModal(c.kind as SourceKind)} onEdit={setModal} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Marks a source that was connected with the sample values and shows simulated numbers. */
function TestBadge() {
  return <span className="inline-block font-sans text-[0.6875rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">Test data</span>;
}

const PILL = {
  none: "bg-surface-container text-on-surface-variant",
  ok: "bg-emerald-50 text-emerald-700",
  error: "bg-error-container/60 text-error",
  never: "bg-amber-50 text-warn",
} as const;

interface ConnectorRowProps {
  def: ConnectorDef;
  /** sources of this kind among the rows on screen */
  connected: SourceRow[];
  /** true when the list is filtered to one dashboard */
  scoped: boolean;
  onConnect: () => void;
  onEdit: (s: SourceRow) => void;
}

function ConnectorRow({ def, connected, scoped, onConnect, onEdit }: ConnectorRowProps) {
  const failing = connected.find((s) => s.status === "error");
  const first = failing ?? connected[0];
  const state = def.planned ? "none" : failing ? "error" : first ? first.status : "none";
  const label = def.planned ? "Planned" : failing ? "Error" : !first ? "Not connected" : connected.length > 1 ? `${connected.length} connected` : first.status === "never" ? "Not synced" : "Connected";
  const detail = def.planned
    ? def.planned
    : failing
      ? (failing.lastError?.message ?? "Last sync failed")
      : first
        ? `${first.keyHint} · synced ${first.lastSyncLabel}${scoped ? "" : ` · ${first.dashboardName}`}`
        : def.desc;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface-container-high last:border-b-0">
      <div className="w-9 h-9 rounded-[8px] bg-surface-container flex items-center justify-center text-[0.6875rem] font-semibold text-on-surface-variant shrink-0">{def.mark}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.875rem] font-medium text-on-surface">{def.name}</span>
          <span className={`text-[0.6875rem] font-medium px-2 py-0.5 rounded-full ${PILL[state]}`}>{label}</span>
          {connected.some((s) => s.keyHint === DEMO_HINT) && <TestBadge />}
        </div>
        <div className={`text-[0.75rem] mt-0.5 break-words ${failing ? "text-error" : "text-on-surface-variant"}`}>{detail}</div>
      </div>
      {!def.planned && (
        <div className="flex items-center gap-2 shrink-0">
          {first && (
            <button onClick={() => onEdit(first)} className="h-8 px-3 rounded-[6px] bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 text-on-surface text-[0.8125rem] font-medium transition-colors">
              {failing ? "Fix" : "Edit"}
            </button>
          )}
          <button onClick={onConnect} className="h-8 px-3.5 rounded-[6px] bg-on-surface hover:bg-on-surface/85 text-surface-container-lowest text-[0.8125rem] font-medium transition-colors">
            {first ? "Add another" : "Connect"}
          </button>
        </div>
      )}
    </div>
  );
}
