import type { V2 } from '../../core/math';
import { Path } from '../../core/path';
import type { World } from '../../world/types';
import { createTask } from '../agv/agv';
import { LINE_Z } from '../production/layout';
import { CONVEYOR_END, RAW_CONVEYOR_START, cellToWorld } from '../warehouse/layout';

/**
 * Roller conveyor carrying finished pallets from the production hall,
 * across the gap between buildings, to a drop-off point inside the warehouse.
 */
const END = cellToWorld(CONVEYOR_END);
export const CONVEYOR_X = END.x;
const START_Z = -44;
export const CONVEYOR_POINTS: V2[] = [
  { x: CONVEYOR_X, z: START_Z },
  { x: CONVEYOR_X, z: END.z },
];
export const CONVEYOR_PATH = new Path(CONVEYOR_POINTS);
export const CONVEYOR_LENGTH = CONVEYOR_PATH.length;
/** Where each production line's transfer feeds the main conveyor. */
export const CONVEYOR_INPUTS = LINE_Z.map((z) => z - START_Z);
/** Belt surface height. */
export const BELT_Y = 0.55;

const SPEED = 1.1;
const GAP = 1.5;

export interface ConveyorItem {
  id: number;
  pos: number;
  line: number;
}

export interface ConveyorState {
  items: ConveyorItem[];
  nextId: number;
  /** A putaway task for the head pallet has been raised. */
  taskOpen: boolean;
}

export const createConveyor = (): ConveyorState => ({ items: [], nextId: 1, taskOpen: false });

export function canInsert(c: ConveyorState, pos: number) {
  return c.items.every((it) => Math.abs(it.pos - pos) >= GAP);
}

export function insertPallet(c: ConveyorState, line: number) {
  c.items.push({ id: c.nextId++, pos: CONVEYOR_INPUTS[line], line });
}

/** Called by the AGV when it lifts the pallet waiting at the end. */
export function takeHead(c: ConveyorState) {
  const i = c.items.findIndex((it) => it.pos >= CONVEYOR_LENGTH - 0.01);
  if (i >= 0) c.items.splice(i, 1);
  c.taskOpen = false;
}

export function updateConveyor(w: World, dt: number) {
  const c = w.conveyor;
  // Accumulating conveyor: each pallet stops GAP behind the one ahead.
  c.items.sort((a, b) => b.pos - a.pos);
  c.items.forEach((it, i) => {
    const limit = i === 0 ? CONVEYOR_LENGTH : c.items[i - 1].pos - GAP;
    it.pos = Math.max(it.pos, Math.min(it.pos + SPEED * dt, limit));
  });
  const head = c.items[0];
  if (head && head.pos >= CONVEYOR_LENGTH - 0.01 && !c.taskOpen) {
    c.taskOpen = true;
    createTask(w, 'putaway', { kind: 'conveyor' }, null, 'finished');
  }
}

// ---- Raw-material conveyor (warehouse → production), mirror image on the west side ----

const RAW_START = cellToWorld(RAW_CONVEYOR_START);
export const RAW_CONVEYOR_X = RAW_START.x;
export const RAW_CONVEYOR_POINTS: V2[] = [
  { x: RAW_CONVEYOR_X, z: RAW_START.z },
  { x: RAW_CONVEYOR_X, z: START_Z },
];
export const RAW_CONVEYOR_LENGTH = RAW_START.z - START_Z;
/** Where each line's feed station takes pallets off the raw conveyor. */
export const RAW_OFFLOAD = LINE_Z.map((z) => RAW_START.z - z);
/** Raw pallets a line keeps beside it. */
export const LINE_BUFFER = 2;

export interface RawConveyorState {
  items: ConveyorItem[];
  nextId: number;
}

export const createRawConveyor = (): RawConveyorState => ({ items: [], nextId: 1 });

/** Room at the warehouse end for another pallet. */
export const canInsertRaw = (c: RawConveyorState) => c.items.every((it) => it.pos >= GAP);

export function insertRaw(c: RawConveyorState, line: number) {
  c.items.push({ id: c.nextId++, pos: 0, line });
}

/** Each pallet rides to its line's feed station and is taken off when that line has room. */
export function updateRawConveyor(w: World, dt: number) {
  const c = w.rawConveyor;
  c.items.sort((a, b) => b.pos - a.pos);
  const taken = new Set<ConveyorItem>();
  c.items.forEach((it, i) => {
    const ahead = c.items.slice(0, i).filter((o) => !taken.has(o)).pop();
    const limit = Math.min(RAW_OFFLOAD[it.line], ahead ? ahead.pos - GAP : Infinity);
    it.pos = Math.max(it.pos, Math.min(it.pos + SPEED * dt, limit));
    const line = w.lines[it.line];
    if (it.pos >= RAW_OFFLOAD[it.line] - 0.01 && line.raw < LINE_BUFFER) {
      line.raw++;
      taken.add(it);
    }
  });
  if (taken.size) c.items = c.items.filter((it) => !taken.has(it));
}
