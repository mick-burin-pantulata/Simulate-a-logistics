import { findGridPath, type Cell, type GridSpec } from '../../core/grid';
import type { V2 } from '../../core/math';

/** World units per grid cell. Grid covers the warehouse floor. */
export const CELL = 2;
export const COLS = 25;
export const ROWS = 16;
/** Rows 0..13 are drivable by AGVs; rows 14-15 are the dock staging strip. */
const DRIVE_ROWS = 14;

export function cellToWorld(c: Cell): V2 {
  return { x: (c.c - (COLS - 1) / 2) * CELL, z: (c.r - (ROWS - 1) / 2) * CELL };
}

// ---- Racks -------------------------------------------------------------

const AISLE_COLS = [8, 16];
/** [rack row, row an AGV stands on to reach it] */
const RACK_ROWS: [number, number][] = [
  [2, 1],
  [3, 4],
  [6, 5],
  [7, 8],
  [10, 9],
  [11, 12],
];
export const LEVEL_Y = [0.15, 1.05, 1.95];
export const SLOTS_PER_RACK = LEVEL_Y.length * 2;

export interface Rack {
  id: number;
  label: string;
  cell: Cell;
  access: Cell;
  x: number;
  z: number;
}

const rackCells = new Set<string>();
export const RACKS: Rack[] = [];
RACK_ROWS.forEach(([r, accessRow], rowIdx) => {
  let n = 1;
  for (let c = 2; c <= COLS - 3; c++) {
    if (AISLE_COLS.includes(c)) continue;
    rackCells.add(`${c},${r}`);
    const { x, z } = cellToWorld({ c, r });
    RACKS.push({
      id: RACKS.length,
      label: `${String.fromCharCode(65 + rowIdx)}${String(n++).padStart(2, '0')}`,
      cell: { c, r },
      access: { c, r: accessRow },
      x,
      z,
    });
  }
});

export const slotLevel = (slot: number) => Math.floor(slot / 2);
export function slotWorld(rack: Rack, slot: number) {
  const side = slot % 2 ? 1 : -1;
  return { x: rack.x + side * 0.42, y: LEVEL_Y[slotLevel(slot)], z: rack.z };
}

// ---- Docks -------------------------------------------------------------

export type DockKind = 'receiving' | 'shipping';
export const STAGE_ROW = 14;
export const DOOR_Z = ROWS; // south wall, world z = 16

export interface DockDef {
  id: number;
  kind: DockKind;
  name: string;
  c: number;
  x: number;
  stage: Cell[];
  stageAccess: Cell[];
  stagePos: V2[];
  /** Where a dock worker stands to handle each staging slot. */
  standPos: V2[];
  doorPos: V2;
  workerHome: V2;
}

export const DOCKS: DockDef[] = [4, 8, 12, 16, 20].map((c, i) => {
  const kind: DockKind = i < 2 ? 'receiving' : 'shipping';
  const x = cellToWorld({ c, r: 0 }).x;
  const stage = [c - 1, c, c + 1].map((sc) => ({ c: sc, r: STAGE_ROW }));
  return {
    id: i,
    kind,
    name: kind === 'receiving' ? `R${i + 1}` : `S${i - 1}`,
    c,
    x,
    stage,
    stageAccess: stage.map((s) => ({ c: s.c, r: STAGE_ROW - 1 })),
    stagePos: stage.map(cellToWorld),
    standPos: stage.map((s) => ({ x: cellToWorld(s).x, z: 14.7 })),
    doorPos: { x, z: 15.7 },
    workerHome: { x: x + 2.7, z: 15.3 },
  };
});

// ---- AGV parking & grid ------------------------------------------------

export const MAX_AGVS = 12;
export const PARKING: Cell[] = Array.from({ length: MAX_AGVS }, (_, i) => ({ c: 6 + i, r: 0 }));

export const GRID: GridSpec = {
  cols: COLS,
  rows: ROWS,
  walkable: (c, r) => r < DRIVE_ROWS && !rackCells.has(`${c},${r}`),
};

export const drivePath = (start: Cell, goal: Cell, blocked?: Set<string>) => findGridPath(GRID, start, goal, blocked);
