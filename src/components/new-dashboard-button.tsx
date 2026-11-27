"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { createDashboardAction, deleteDashboardAction } from "@/lib/actions";

const inputClass =
  "w-full bg-surface-container-lowest border border-outline-variant/50 rounded-[6px] px-3 py-2 text-[0.875rem] text-on-surface focus:outline-none focus:border-primary";

/** Opens a small form; the new dashboard starts with one empty page and no sources. */
export function NewDashboardButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function close() {
    setOpen(false);
    setName("");
    setDescription("");
    setError(null);
  }

  function create() {
    setError(null);
    start(async () => {
      const r = await createDashboardAction({ name, description });
      if (!r.ok) return setError(r.error);
      close();
      // an empty dashboard needs a source first; the dashboard page says so
      router.push(`/dashboard?d=${encodeURIComponent(r.id)}`);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-primary"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
        <span>New dashboard</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={close}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
            className="w-full max-w-[480px] bg-surface-container-lowest rounded-[18px] shadow-xl border border-outline-variant/30"
          >
            <div className="px-5 py-4 border-b border-surface-container">
              <h2 className="text-[1.0625rem] font-semibold text-on-surface">New dashboard</h2>
              <p className="text-[0.75rem] text-on-surface-variant mt-0.5">Starts empty: one page, no sources. Next you add a source, then widgets.</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label htmlFor="nd-name" className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">
                  Name
                </label>
                <input id="nd-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="CMS" className={inputClass} />
              </div>
              <div>
                <label htmlFor="nd-desc" className="text-[0.75rem] font-medium text-on-surface-variant block mb-1">
                  Description <span className="text-outline font-normal">(optional)</span>
                </label>
                <input id="nd-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pages, media and editorial activity" className={inputClass} />
              </div>
              {error && <p className="text-[0.8125rem] text-error">{error}</p>}
            </div>
            <div className="px-5 py-3 border-t border-surface-container flex justify-between">
              <button type="button" onClick={close} className="px-3 py-1.5 text-[0.875rem] text-on-surface-variant hover:text-on-surface">
                Cancel
              </button>
              <button type="submit" disabled={pending || !name.trim()} className="btn btn-primary">
                {pending ? "Creating…" : "Create dashboard"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function DeleteDashboardButton({ id, name, sources }: { id: string; name: string; sources: number }) {
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();
  return (
    <>
    {dialog}
    <button
      title="Delete dashboard"
      disabled={pending}
      onClick={async () => {
        if (!(await confirm({ title: `Delete dashboard “${name}”?`, message: `Its pages and ${sources} source(s) will be deleted too.` }))) return;
        start(async () => {
          const r = await deleteDashboardAction(id);
          if (!r.ok) await confirm({ title: "Could not delete dashboard", message: r.error, confirmLabel: "OK", danger: false });
        });
      }}
      className="text-outline hover:text-error p-1 rounded flex disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-[16px]">delete</span>
    </button>
    </>
  );
}
