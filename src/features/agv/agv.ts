import { cellKey, manhattan, sameCell, type Cell } from '../../core/grid';
import { approach, lerpAngle } from '../../core/math';
import type { World } from '../../world/types';
import { reserveFreeSlot, setSlot } from '../warehouse/inventory';
import {
  CELL,
  DOCKS,
  LEVEL_Y,
  MAX_AGVS,
  PARKING,
  RACKS,
  cellToWorld,
  drivePath,
  slotLevel,
} from '../warehouse/layout';

export type AgvState = 'idle' | 'toPickup' | 'loading' | 'toDrop' | 'unloading' | 'toPark';

export type Loc = { kind: 'rack'; rack: number; slot: number } | { kind: 'stage'; dock: number; slot: number };

export interface Task {
  id: number;
  kind: 'putaway' | 'pick';
  src: Loc;
  /** Putaway destinations are chosen when an AGV takes the task. */
  dst: Loc | null;
  status: 'pending' | 'active';
  agvId: number | null;
  createdAt: number;
}

export interface Agv {
  id: number;
  name: string;
  state: AgvState;
  cell: Cell;
  next: Cell | null;
  progress: number;
  path: Cell[];
  x: number;
  z: number;
  heading: number;
  taskId: number | null;
  carrying: boolean;
  forkY: number;
  timer: number;
  waitTime: number;
  repathed: boolean;
  distance: number;
  moved: number;
  busyTime: number;
  parkCell: Cell;
}

const SPEED = 3.2;
const HANDLE_TIME = 0.8;
const FORK_SPEED = 1.4;
const REPATH_AFTER = 1.2;
/** After waiting this long, drive through the blocker to break deadlocks. */
const GHOST_AFTER = 4;
export const FORK_LOW = 0.08;
const FORK_CARRY = 0.3;

// ---- Locations ---------------------------------------------------------

export const locAccess = (l: Loc): Cell =>
  l.kind === 'rack' ? RACKS[l.rack].access : DOCKS[l.dock].stageAccess[l.slot];

const locFaceCell = (l: Loc): Cell => (l.kind === 'rack' ? RACKS[l.rack].cell : DOCKS[l.dock].stage[l.slot]);

const locHeight = (l: Loc) => (l.kind === 'rack' ? LEVEL_Y[slotLevel(l.slot)] + 0.05 : FORK_LOW);

export const locLabel = (l: Loc) =>
  l.kind === 'rack'
    ? `ชั้น ${RACKS[l.rack].label}-${l.slot + 1}`
    : `${DOCKS[l.dock].name} ช่องพัก ${l.slot + 1}`;

// ---- Fleet -------------------------------------------------------------

function createAgv(id: number): Agv {
  const parkCell = PARKING[id];
  const w = cellToWorld(parkCell);
  return {
    id,
    name: `AGV-${String(id + 1).padStart(2, '0')}`,
    state: 'idle',
    cell: parkCell,
    next: null,
    progress: 0,
    path: [],
    x: w.x,
    z: w.z,
    heading: 0,
    taskId: null,
    carrying: false,
    forkY: FORK_LOW,
    timer: 0,
    waitTime: 0,
    repathed: false,
    distance: 0,
    moved: 0,
    busyTime: 0,
    parkCell,
  };
}

export function addAgv(w: World) {
  if (w.agvs.length >= MAX_AGVS) return;
  const used = new Set(w.agvs.map((v) => v.id));
  let id = 0;
  while (used.has(id)) id++;
  const v = createAgv(id);
  const k = cellKey(v.cell);
  if (!w.reservations.has(k)) w.reservations.set(k, v.id);
  w.agvs.push(v);
  w.agvs.sort((a, b) => a.id - b.id);
}

export function removeAgv(w: World) {
  const v = w.agvs.pop();
  if (!v) return;
  release(w, v.cell, v.id);
  if (v.next) release(w, v.next, v.id);
  const task = w.tasks.find((t) => t.id === v.taskId);
  if (!task) return;
  if (v.carrying && task.dst) {
    // Hand the pallet over instantly rather than losing it.
    completeDrop(w, task);
    w.tasks = w.tasks.filter((t) => t !== task);
  } else {
    task.status = 'pending';
    task.agvId = null;
    if (task.kind === 'putaway' && task.dst?.kind === 'rack') {
      w.inventory.slots[task.dst.rack][task.dst.slot].reserved = false;
      task.dst = null;
    }
  }
}

export function createTask(w: World, kind: Task['kind'], src: Loc, dst: Loc | null) {
  w.tasks.push({ id: w.nextTaskId++, kind, src, dst, status: 'pending', agvId: null, createdAt: w.time });
}

// ---- Behaviour ---------------------------------------------------------

function release(w: World, cell: Cell, id: number) {
  const k = cellKey(cell);
  if (w.reservations.get(k) === id) w.reservations.delete(k);
}

const origin = (v: Agv) => v.next ?? v.cell;

function routeTo(v: Agv, goal: Cell) {
  v.path = drivePath(origin(v), goal) ?? [];
  v.waitTime = 0;
  v.repathed = false;
}

function assignTasks(w: World) {
  const free = w.agvs.filter((v) => v.state === 'idle' || v.state === 'toPark');
  for (const task of w.tasks) {
    if (!free.length) return;
    if (task.status !== 'pending') continue;
    if (!task.dst) {
      const slot = reserveFreeSlot(w.inventory);
      if (!slot) continue;
      task.dst = { kind: 'rack', ...slot };
    }
    const target = locAccess(task.src);
    let best = 0;
    for (let i = 1; i < free.length; i++) {
      if (manhattan(origin(free[i]), target) < manhattan(origin(free[best]), target)) best = i;
    }
    const v = free.splice(best, 1)[0];
    task.status = 'active';
    task.agvId = v.id;
    v.taskId = task.id;
    v.state = 'toPickup';
    routeTo(v, target);
  }
}

function tryStep(w: World, v: Agv, dt: number) {
  const target = v.path[0];
  const k = cellKey(target);
  const owner = w.reservations.get(k);
  const free = owner === undefined || owner === v.id;

  if (free || v.waitTime > GHOST_AFTER) {
    if (free) w.reservations.set(k, v.id);
    v.next = v.path.shift()!;
    v.progress = 0;
    v.waitTime = 0;
    v.repathed = false;
    return;
  }

  v.waitTime += dt;
  if (!v.repathed && v.waitTime > REPATH_AFTER) {
    v.repathed = true;
    const blocked = new Set<string>();
    w.reservations.forEach((id, key) => id !== v.id && blocked.add(key));
    const alt = drivePath(v.cell, v.path[v.path.length - 1], blocked);
    if (alt && alt.length <= v.path.length + 6) v.path = alt;
  }
}

function completePickup(w: World, task: Task) {
  const src = task.src;
  if (src.kind === 'rack') setSlot(w.inventory, src, false);
  else w.docks[src.dock].stage[src.slot] = { full: false, reserved: false };
}

function completeDrop(w: World, task: Task) {
  const dst = task.dst!;
  if (dst.kind === 'rack') {
    setSlot(w.inventory, dst, true);
  } else {
    const dock = w.docks[dst.dock];
    dock.stage[dst.slot] = { full: true, reserved: false };
    dock.requested = Math.max(0, dock.requested - 1);
  }
}

function arrive(v: Agv) {
  switch (v.state) {
    case 'toPickup':
      v.state = 'loading';
      v.timer = HANDLE_TIME;
      break;
    case 'toDrop':
      v.state = 'unloading';
      v.timer = HANDLE_TIME;
      break;
    case 'toPark':
      v.state = 'idle';
      break;
    case 'idle':
      if (!sameCell(v.cell, v.parkCell)) {
        v.state = 'toPark';
        routeTo(v, v.parkCell);
      }
      break;
  }
}

function handle(w: World, v: Agv, task: Task | undefined, dt: number) {
  const loc = v.state === 'loading' ? task?.src : task?.dst;
  const target = loc ? locHeight(loc) : FORK_LOW;
  v.forkY = approach(v.forkY, target, FORK_SPEED * dt);
  if (Math.abs(v.forkY - target) > 1e-3) return; // still raising/lowering forks
  v.timer -= dt;
  if (v.timer > 0) return;

  if (!task) {
    v.state = 'idle';
    v.carrying = false;
    return;
  }
  if (v.state === 'loading') {
    completePickup(w, task);
    v.carrying = true;
    v.state = 'toDrop';
    routeTo(v, locAccess(task.dst!));
  } else {
    completeDrop(w, task);
    w.tasks = w.tasks.filter((t) => t !== task);
    v.carrying = false;
    v.taskId = null;
    v.moved++;
    v.state = 'idle';
  }
}

function updatePose(v: Agv, task: Task | undefined, dt: number) {
  const a = cellToWorld(v.cell);
  let face: { x: number; z: number } | null = null;
  if (v.next) {
    const b = cellToWorld(v.next);
    v.x = a.x + (b.x - a.x) * v.progress;
    v.z = a.z + (b.z - a.z) * v.progress;
    face = b;
  } else {
    v.x = a.x;
    v.z = a.z;
    const loc = v.state === 'loading' ? task?.src : v.state === 'unloading' ? task?.dst : null;
    if (loc) face = cellToWorld(locFaceCell(loc));
  }
  if (face && (face.x !== v.x || face.z !== v.z)) {
    v.heading = lerpAngle(v.heading, Math.atan2(face.x - v.x, face.z - v.z), 1 - Math.exp(-12 * dt));
  }
}

function updateAgv(w: World, v: Agv, dt: number) {
  const task = v.taskId !== null ? w.tasks.find((t) => t.id === v.taskId) : undefined;
  if (v.state !== 'idle' && v.state !== 'toPark') v.busyTime += dt;

  if (v.state === 'loading' || v.state === 'unloading') {
    handle(w, v, task, dt);
  } else {
    v.forkY = approach(v.forkY, v.carrying ? FORK_CARRY : FORK_LOW, FORK_SPEED * dt);
    if (v.next) {
      v.progress += (SPEED * dt) / CELL;
      if (v.progress >= 1) {
        release(w, v.cell, v.id);
        v.cell = v.next;
        v.next = null;
        v.progress = 0;
        v.distance += CELL;
      }
    } else if (v.path.length) {
      tryStep(w, v, dt);
    } else {
      arrive(v);
    }
  }
  updatePose(v, task, dt);
}

export function updateAgvs(w: World, dt: number) {
  assignTasks(w);
  for (const v of w.agvs) updateAgv(w, v, dt);
}

/** Cells still to drive, in world coordinates, for path display. */
export function agvRoute(v: Agv): [number, number][] {
  return [v.cell, ...(v.next ? [v.next] : []), ...v.path].map((c) => {
    const p = cellToWorld(c);
    return [p.x, p.z];
  });
}
