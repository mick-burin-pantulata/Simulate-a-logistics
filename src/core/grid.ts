export interface Cell {
  c: number;
  r: number;
}

export const cellKey = (c: Cell) => `${c.c},${c.r}`;
export const sameCell = (a: Cell, b: Cell) => a.c === b.c && a.r === b.r;
export const manhattan = (a: Cell, b: Cell) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);

export interface GridSpec {
  cols: number;
  rows: number;
  walkable: (c: number, r: number) => boolean;
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Breadth-first search on a 4-connected grid.
 * Returns the cells after `start` up to and including `goal`, or null if unreachable.
 * Cells in `blocked` are avoided, except the goal itself.
 */
export function findGridPath(grid: GridSpec, start: Cell, goal: Cell, blocked?: Set<string>): Cell[] | null {
  const { cols, rows } = grid;
  const idx = (c: number, r: number) => r * cols + c;
  const startIdx = idx(start.c, start.r);
  const goalIdx = idx(goal.c, goal.r);
  if (startIdx === goalIdx) return [];

  const prev = new Int32Array(cols * rows).fill(-1);
  prev[startIdx] = startIdx;
  const queue = [startIdx];

  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cur === goalIdx) break;
    const c = cur % cols;
    const r = (cur - c) / cols;
    for (const [dc, dr] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || !grid.walkable(nc, nr)) continue;
      const ni = idx(nc, nr);
      if (prev[ni] !== -1) continue;
      if (blocked && ni !== goalIdx && blocked.has(`${nc},${nr}`)) continue;
      prev[ni] = cur;
      queue.push(ni);
    }
  }

  if (prev[goalIdx] === -1) return null;
  const path: Cell[] = [];
  for (let i = goalIdx; i !== startIdx; i = prev[i]) path.push({ c: i % cols, r: Math.floor(i / cols) });
  return path.reverse();
}
