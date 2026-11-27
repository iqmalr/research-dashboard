import { SyncButton } from "./sync-button";

export function GlobalHeader() {
  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/20 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[0.875rem] text-on-surface-variant">
          <span className="font-medium hover:text-on-surface cursor-pointer">Custom Dashboard</span>
          <span className="text-outline-variant mx-1">/</span>
          <span className="text-on-surface font-semibold">Production</span>
          <span className="ml-2 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[0.6875rem] font-medium">
            v2.4.1
          </span>
        </div>
        <div className="h-4 w-px bg-outline-variant/30 mx-1" />
        <div className="hidden lg:flex items-center gap-1 text-outline font-mono text-[0.75rem]">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          <span>Manual sync · the daily cron is not wired in this prototype</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 rounded text-outline hover:text-on-surface transition-all text-[0.875rem]">
          <span className="material-symbols-outlined text-[16px]">search</span>
          <span className="text-[0.75rem] font-medium">Quick find</span>
          <kbd className="font-mono text-[0.75rem] bg-surface-container-highest px-1 rounded text-on-surface-variant border border-outline-variant/40">
            ⌘K
          </kbd>
        </button>
        <SyncButton
          label="Sync all"
          className="btn"
        />
        <div className="h-4 w-px bg-outline-variant/30" />
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant text-[0.75rem] font-semibold border border-outline-variant/30">
          ER
        </div>
      </div>
    </header>
  );
}
