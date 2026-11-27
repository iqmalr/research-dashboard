"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** red confirm button; default true since this is used for deletes */
  danger?: boolean;
}

/** Promise-based replacement for window.confirm/alert. Render `dialog` once in the component. */
export function useConfirm(): { confirm: (o: ConfirmOptions) => Promise<boolean>; dialog: ReactNode } {
  const [opts, setOpts] = useState<(ConfirmOptions & { alert?: boolean }) | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});

  const ask = useCallback(
    (o: ConfirmOptions & { alert?: boolean }) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  const finish = (v: boolean) => {
    resolver.current(v);
    setOpts(null);
  };

  const dialog = opts && (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
      onClick={() => finish(false)}
      onKeyDown={(e) => e.key === "Escape" && finish(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] bg-surface-container-lowest rounded-[18px] shadow-xl border border-outline-variant/30"
      >
        <div className="px-5 py-4">
          <h2 id="confirm-title" className="text-[1.0625rem] font-semibold text-on-surface">
            {opts.title}
          </h2>
          {opts.message && <p className="text-[0.8125rem] text-on-surface-variant mt-1.5">{opts.message}</p>}
        </div>
        <div className="px-5 py-3 border-t border-surface-container flex justify-end gap-2">
          {!opts.alert && (
            <button type="button" onClick={() => finish(false)} className="btn">
              Cancel
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => finish(true)}
            className={opts.danger === false || opts.alert ? "btn btn-primary" : "btn btn-primary !bg-error !border-error !text-white"}
          >
            {opts.confirmLabel ?? (opts.alert ? "OK" : "Delete")}
          </button>
        </div>
      </div>
    </div>
  );

  return {
    confirm: ask,
    dialog,
  };
}
