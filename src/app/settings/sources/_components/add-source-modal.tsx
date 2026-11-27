"use client";
import { useState, useTransition } from "react";
import { FieldTree } from "@/components/field-tree";
import { useRouter } from "next/navigation";
import { saveSourceAction, testSourceAction } from "@/lib/actions";
import { connectorDef, type ConnectorField } from "@/lib/connectors/catalog";
import type { SourceInfo, SourceKind } from "@/lib/types";

interface AddSourceModalProps {
  /** "endpoint" for a JSON URL of our own, otherwise the connector to set up */
  kind: SourceKind;
  /** set when editing an existing source */
  editing?: SourceInfo;
  dashboards: { id: string; name: string }[];
  /** preselected owner for a new source */
  defaultDashboardId: string;
  /** base URL of the local mock backend, shown as a hint in development */
  mockHint: string;
  onClose: () => void;
}

type TestResult = Awaited<ReturnType<typeof testSourceAction>>;

const inputClass =
  "w-full h-8 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded font-mono text-[0.8125rem] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary shadow-sm";

const kb = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

export function AddSourceModal({ kind, editing, dashboards, defaultDashboardId, mockHint, onClose }: AddSourceModalProps) {
  const def = kind === "endpoint" ? undefined : connectorDef(kind);
  const fields = def?.fields ?? [];
  const router = useRouter();
  const [dashboardId, setDashboardId] = useState(editing?.dashboardId ?? defaultDashboardId);
  const [name, setName] = useState(editing?.name ?? def?.name ?? "");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  // connector fields by key; secrets start empty, even when editing
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.secret ? "" : (editing?.config[f.key] ?? f.options?.[0] ?? "")])));
  const [addPage, setAddPage] = useState(true);
  const [result, setResult] = useState<TestResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testing, startTest] = useTransition();
  const [saving, startSave] = useTransition();

  const step = result?.ok ? "preview" : result ? "error" : "form";
  const failure = result && !result.ok ? result : null;
  const success = result?.ok ? result : null;
  // a secret may stay empty while editing: the stored one is kept
  const filled = (f: ConnectorField) => f.optional || values[f.key]?.trim() !== "" || (f.secret && Boolean(editing));
  const canTest = name.trim() !== "" && (def ? fields.every(filled) : url.trim() !== "");

  const pick = (secret: boolean) => Object.fromEntries(fields.filter((f) => f.secret === secret).map((f) => [f.key, values[f.key] ?? ""]));
  const input = () => ({ id: editing?.id, kind, url, credentials: def ? pick(true) : { apiKey }, config: def ? pick(false) : {} });

  // testing mode is on when the server allows mock sources (development)
  const testing_ = Boolean(mockHint);
  const usingSample = Boolean(def?.sample) && fields.filter((f) => f.secret).some((f) => values[f.key]?.trim().toLowerCase() === "demo");

  function fillSample() {
    setValues((v) => ({ ...v, ...def?.sample }));
    setResult(null);
  }

  function setValue(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setResult(null);
  }

  function test() {
    setSaveError(null);
    startTest(async () => setResult(await testSourceAction(input())));
  }

  function save() {
    startSave(async () => {
      const r = await saveSourceAction({ ...input(), dashboardId, name, addPage: Boolean(def) && !editing && addPage });
      if (!r.ok) return setSaveError(r.error);
      onClose();
      // the new page is the quickest way to see what the connector brought in
      if (r.pageId) router.push(`/dashboard?d=${encodeURIComponent(dashboardId)}&page=${encodeURIComponent(r.pageId)}`);
    });
  }

  const roots = success && success.data && typeof success.data === "object" ? Object.keys(success.data) : [];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl max-h-[calc(100vh-3rem)] bg-surface-container-lowest rounded-[18px] shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 bg-surface-container-lowest flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-on-surface-variant">
              {def ? <span className="text-[0.6875rem] font-semibold">{def.mark}</span> : <span className="material-symbols-outlined text-[18px]">cloud_download</span>}
            </div>
            <div>
              <h2 className="text-[1.125rem] font-semibold text-on-surface tracking-tight leading-6">{def ? `${editing ? "Edit" : "Connect"} ${def.name}` : editing ? "Edit source" : "Add source"}</h2>
              <p className="text-[0.6875rem] text-outline tracking-wide">{def ? `${def.desc}. Read-only, and tested before it is saved.` : "A JSON endpoint called with GET and a Bearer key. It is tested before it is saved."}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Stepper */}
        <div className="bg-surface-container-low px-6 py-2 flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {step === "error" ? (
                <span className="w-5 h-5 rounded-full bg-error-container text-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-[13px]">priority_high</span>
                </span>
              ) : step === "preview" ? (
                <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary text-[11px] font-semibold flex items-center justify-center">1</span>
              )}
              <span className={`text-[0.75rem] font-semibold ${step === "error" ? "text-error" : "text-on-surface"}`}>1. Connection</span>
              {step === "preview" && <span className="text-[0.6875rem] px-1.5 py-0.5 rounded bg-surface-container text-primary font-medium">Verified</span>}
              {step === "error" && <span className="text-[0.6875rem] px-1.5 py-0.5 rounded bg-error-container text-error font-medium">Failed</span>}
            </div>
            <div className="w-10 h-px bg-outline-variant/40 mx-1" />
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full text-[11px] font-semibold flex items-center justify-center ${step === "preview" ? "bg-primary-container text-on-primary" : "bg-surface-container-highest text-outline"}`}>2</span>
              <span className={`text-[0.75rem] font-semibold ${step === "preview" ? "text-on-surface" : "text-outline"}`}>2. Response preview</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-outline text-[0.75rem] font-mono">
            <span className="material-symbols-outlined text-[15px]">security</span>
            <span>{def ? "read-only access · credentials encrypted at rest" : "https only · private addresses blocked"}</span>
          </div>
        </div>

        {!success ? (
          /* Step 1: form (+ error) */
          <div className="grid grid-cols-1 p-6 gap-4 overflow-y-auto">
            {failure && (
              <div className="p-3 rounded-[6px] bg-error-container/40 border border-error/20 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-error shrink-0 mt-0.5">error</span>
                <div>
                  <div className="text-[0.75rem] font-semibold text-error">{failure.message}</div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">
                    {failure.kind === "auth" && (def ? "Check the credentials and the permissions they were given, then try again." : "The endpoint refused the key. Check the API key and try again.")}
                    {failure.kind === "timeout" && (def ? "The service did not answer in time. Try again later." : "The endpoint did not answer in time. Check the URL, or try again later.")}
                    {failure.kind === "network" && (def ? "The service could not be reached from this server." : "Nothing answered at this address. Check the host and port.")}
                    {failure.kind === "rate_limit" && "Requests are being limited. Wait a moment and test again."}
                    {failure.kind === "http" && (def ? "The service is reachable but answered with an error." : "The endpoint is reachable but answered with an error.")}
                    {failure.kind === "invalid" && (def ? "Fix the field above and test again." : "A source must return a JSON object.")}
                    {failure.kind === "blocked" && "This URL is not allowed as a source."}
                    {failure.ms > 0 && <span className="font-mono text-outline"> · {failure.ms} ms</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">Dashboard</label>
                <select value={dashboardId} onChange={(e) => setDashboardId(e.target.value)} disabled={Boolean(editing)} aria-label="Dashboard" className={`${inputClass} font-sans disabled:opacity-60`}>
                  {dashboards.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <p className="text-[0.6875rem] text-outline mt-1">Only widgets of this dashboard can read from the source.</p>
              </div>
              <div>
                <label className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={def ? def.name : "v2 users"} className={inputClass} />
              </div>
              {def ? (
                <>
                  {testing_ && def.sample && (
                    <div className="rounded-[6px] border border-amber-300 bg-amber-50 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                            <span className="material-symbols-outlined text-[13px]">science</span>
                            Testing
                          </span>
                          <span className="text-[0.8125rem] font-medium text-amber-900">No {def.name} account needed</span>
                        </div>
                        <button type="button" onClick={fillSample} className="h-7 px-2.5 rounded-[6px] bg-amber-900 hover:bg-amber-800 text-white text-[0.75rem] font-medium transition-colors">
                          Fill in test values
                        </button>
                      </div>
                      <p className="text-[0.75rem] text-amber-900/90">Enter these values in the form. The connection is then answered with simulated data in the shape of {def.name}’s API, and nothing is sent to {def.name}.</p>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.75rem]">
                        {fields
                          .filter((f) => def.sample?.[f.key])
                          .map((f) => (
                            <div key={f.key} className="contents">
                              <dt className="text-amber-900/80">{f.label}</dt>
                              <dd className="font-mono text-amber-950">{def.sample?.[f.key]}</dd>
                            </div>
                          ))}
                      </dl>
                      {def.endpoints && (
                        <div className="text-[0.6875rem] text-amber-900/80 pt-1 border-t border-amber-200">
                          Calls it would make with a real account (from the API docs, not yet tried against one):
                          <ul className="font-mono mt-1 space-y-0.5">
                            {def.endpoints.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {fields.map((f) => (
                    <div key={f.key}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[0.75rem] font-medium text-on-surface-variant">{f.label}</label>
                        {f.optional && <span className="text-[0.6875rem] text-outline">optional</span>}
                      </div>
                      {f.options ? (
                        <select value={values[f.key]} onChange={(e) => setValue(f.key, e.target.value)} aria-label={f.label} className={`${inputClass} font-sans`}>
                          {f.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : f.multiline ? (
                        <textarea
                          value={values[f.key]}
                          onChange={(e) => setValue(f.key, e.target.value)}
                          placeholder={editing ? `Leave empty to keep the current one (${editing.keyHint})` : f.placeholder}
                          spellCheck={false}
                          autoComplete="off"
                          rows={5}
                          className={`${inputClass} h-auto py-2 text-[0.75rem] resize-y placeholder:font-sans placeholder:text-outline`}
                        />
                      ) : (
                        <input
                          type={f.secret ? "password" : "text"}
                          value={values[f.key]}
                          onChange={(e) => setValue(f.key, e.target.value)}
                          placeholder={f.secret && editing ? `Leave empty to keep the current one (${editing.keyHint})` : f.placeholder}
                          spellCheck={false}
                          autoComplete="off"
                          className={`${inputClass} placeholder:font-sans placeholder:text-outline ${f.secret && failure?.kind === "auth" ? "border-error" : ""}`}
                        />
                      )}
                      {f.help && <p className="text-[0.6875rem] text-outline mt-1">{f.help}</p>}
                    </div>
                  ))}
                  {def.note && <p className="text-[0.75rem] text-on-surface-variant bg-surface-container-low rounded p-3">{def.note}</p>}
                </>
              ) : (
                <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[0.75rem] font-medium text-on-surface-variant">Endpoint URL</label>
                  <span className="font-mono text-[0.75rem] text-outline">HTTP GET · ?range= is added per period</span>
                </div>
                <input
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setResult(null);
                  }}
                  placeholder="https://example.com/api/stats/users"
                  spellCheck={false}
                  className={`${inputClass} ${failure && failure.kind !== "auth" ? "border-error" : ""}`}
                />
                {mockHint && (
                  <p className="text-[0.6875rem] text-outline mt-1">
                    Dev mock: <code className="font-mono">{mockHint}/users</code>, <code className="font-mono">/revenue</code>, <code className="font-mono">/content</code>, <code className="font-mono">/cms</code>. Add{" "}
                    <code className="font-mono">?simulate=500</code> (or 401, rate_limit, slow, timeout, schema_change, empty) to try a failure state.
                  </p>
                )}
              </div>
              <div>
                <label className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">API key</label>
                <div className={`flex items-center bg-surface-container-lowest border rounded px-3 h-8 ${failure?.kind === "auth" ? "border-error" : "border-outline-variant/40"}`}>
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setResult(null);
                    }}
                    placeholder={editing ? `Leave empty to keep the current key (${editing.keyHint || "none"})` : "Sent as Authorization: Bearer <key>"}
                    autoComplete="off"
                    className="flex-1 bg-transparent font-mono text-[0.8125rem] text-on-surface focus:outline-none placeholder:font-sans placeholder:text-outline"
                  />
                  <button onClick={() => setShowKey((v) => !v)} type="button" className="text-outline hover:text-on-surface p-0.5 rounded ml-2 transition-colors flex">
                    <span className="material-symbols-outlined text-[16px]">{showKey ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>
                </>
              )}
              <div className="p-3 bg-surface-container-low rounded flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-outline">sync</span>
                  <span className="text-[0.8125rem] text-on-surface-variant">Sync</span>
                </div>
                <span className="font-mono text-[0.75rem] text-on-surface">On save and on demand · scheduled sync is not wired in this prototype</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
              <button onClick={onClose} className="h-8 px-3 text-outline hover:text-on-surface text-[0.875rem] transition-colors">
                Cancel
              </button>
              <button
                onClick={test}
                disabled={!canTest || testing}
                className="btn btn-primary"
              >
                <span className={`material-symbols-outlined text-[16px] ${testing ? "animate-spin" : ""}`}>{testing ? "progress_activity" : "wifi_tethering"}</span>
                {testing ? "Testing…" : "Test connection"}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: response preview */
          <div className="grid grid-cols-12 min-h-[440px] overflow-hidden">
            <div className="col-span-5 p-6 bg-surface-container-lowest flex flex-col justify-between border-r border-outline-variant/20">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[0.6875rem] font-semibold text-outline uppercase tracking-wider">Parameters</span>
                  <button onClick={() => setResult(null)} className="text-[0.6875rem] text-primary font-semibold">
                    Edit values
                  </button>
                </div>
                <ReadOnly label="Dashboard" value={dashboards.find((d) => d.id === dashboardId)?.name ?? ""} />
                <ReadOnly label="Name" value={name} />
                {def ? (
                  fields
                    .filter((f) => f.secret || values[f.key])
                    .map((f) => <ReadOnly key={f.key} label={f.label} value={f.secret ? (values[f.key] ? "•".repeat(24) : editing?.keyHint || "(none)") : values[f.key]} />)
                ) : (
                  <>
                    <ReadOnly label="Endpoint URL" value={url} />
                    <ReadOnly label="API key" value={apiKey ? "•".repeat(Math.min(apiKey.length, 24)) : editing?.keyHint || "(none)"} />
                  </>
                )}
              </div>
              <div className="mt-3 bg-surface-container-low/50 p-3 rounded flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="text-[0.6875rem] font-medium text-on-surface-variant">{!def ? "Endpoint answered with JSON" : usingSample ? `Simulated ${def.name} data, not a real account` : `${def.name} accepted the credentials`}</span>
                </div>
                <button onClick={test} disabled={testing} className="text-[0.75rem] text-primary font-medium hover:underline disabled:opacity-60">
                  {testing ? "Testing…" : "Re-test"}
                </button>
              </div>
            </div>

            <div className="col-span-7 bg-surface-container-low/30 p-6 flex flex-col justify-between min-h-0">
              <div className="space-y-3 min-h-0 flex flex-col">
                <div className="flex items-center justify-between bg-surface-container-lowest p-3 rounded shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[15px]">done_all</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[0.8125rem] font-semibold text-primary">{success.status} OK</span>
                        <span className="text-outline text-[0.75rem]">•</span>
                        <span className="font-mono text-[0.75rem] text-on-surface-variant">{success.ms} ms</span>
                      </div>
                      <span className="text-[0.6875rem] text-outline">Response size: {kb(success.bytes)} · range=30d</span>
                    </div>
                  </div>
                  {usingSample ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[0.6875rem] font-semibold uppercase tracking-wide">Test data</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[0.75rem] text-outline">application/json</span>
                  )}
                </div>

                <span className="text-[0.8125rem] text-on-surface-variant">This is what widgets will be able to pick from. Check it before saving.</span>

                <div className="bg-surface-container-lowest rounded py-2 shadow-sm max-h-[280px] overflow-y-auto">
                  <FieldTree data={success.data} />
                </div>

                <div className="flex items-center gap-1.5 text-outline text-[0.6875rem]">
                  <span className="material-symbols-outlined text-[14px] text-primary">account_tree</span>
                  <span>
                    {roots.length} top-level key{roots.length === 1 ? "" : "s"}: <span className="font-mono">{roots.join(", ")}</span>
                  </span>
                </div>
                {def && !editing && (
                  <label className="flex items-center gap-2 text-[0.8125rem] text-on-surface cursor-pointer">
                    <input type="checkbox" checked={addPage} onChange={(e) => setAddPage(e.target.checked)} className="accent-primary-container" />
                    Add a ready-made “{def.name}” page to this dashboard
                  </label>
                )}
                {saveError && <div className="text-[0.75rem] text-error">{saveError}</div>}
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-outline-variant/20">
                <button onClick={() => setResult(null)} className="btn">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={onClose} className="h-8 px-3 text-outline hover:text-on-surface text-[0.875rem] transition-colors">
                    Cancel
                  </button>
                  <button onClick={save} disabled={saving} className="btn btn-primary">
                    <span className={`material-symbols-outlined text-[16px] ${saving ? "animate-spin" : ""}`}>{saving ? "progress_activity" : "save"}</span>
                    {saving ? "Saving and syncing…" : def && !editing ? `Connect ${def.name}` : "Save source"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">{label}</label>
      <div className="w-full bg-surface-container-low text-on-surface font-mono text-[0.8125rem] px-3 py-1.5 rounded break-all">{value}</div>
    </div>
  );
}
