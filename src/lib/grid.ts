import type { GridPos, Widget } from "./types";

export const GRID_COLS = 12;
export const MAX_H = 6;

const int = (n: unknown, fallback: number) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : fallback);

export function clampGrid(g: Partial<GridPos>): GridPos {
  const w = Math.min(GRID_COLS, Math.max(1, int(g.w, 4)));
  const h = Math.min(MAX_H, Math.max(1, int(g.h, 1)));
  const x = Math.min(GRID_COLS - w, Math.max(0, int(g.x, 0)));
  const y = Math.max(0, int(g.y, 0));
  return { x, y, w, h };
}

const overlap = (a: GridPos, b: GridPos) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** First free spot for a w×h box, scanning row by row. */
export function findFreeSlot(widgets: Widget[], w: number, h: number): { x: number; y: number } {
  for (let y = 0; ; y++) {
    for (let x = 0; x + w <= GRID_COLS; x++) {
      const box = { x, y, w, h };
      if (!widgets.some((o) => overlap(box, o.grid))) return { x, y };
    }
  }
}

/**
 * Removes overlaps and vertical gaps: every widget floats up as far as it can,
 * and anything it lands on is pushed down. `priorityId` wins ties, so a widget
 * the user just moved keeps its spot and the others give way.
 */
export function compact(widgets: Widget[], priorityId?: string): Widget[] {
  const sorted = [...widgets].sort(
    (a, b) =>
      a.grid.y - b.grid.y ||
      Number(b.id === priorityId) - Number(a.id === priorityId) ||
      a.grid.x - b.grid.x,
  );
  const placed: Widget[] = [];
  for (const w of sorted) {
    const g = clampGrid(w.grid);
    const hits = (y: number) => placed.some((o) => overlap({ ...g, y }, o.grid));
    while (g.y > 0 && !hits(g.y - 1)) g.y--;
    while (hits(g.y)) g.y++;
    placed.push({ ...w, grid: g });
  }
  // keep the original array order so widget order in the file stays stable
  return widgets.map((w) => placed.find((p) => p.id === w.id)!);
}
