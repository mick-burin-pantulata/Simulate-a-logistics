import type { World } from '../../world/types';
import { createTask } from '../agv/agv';
import { CONVEYOR_INPUTS, LINE_BUFFER, canInsert, insertPallet } from '../conveyor/conveyor';
import { reserveFullSlot } from '../warehouse/inventory';
import type { Worker } from '../workers/workers';
import { LINE_Z, PALLETIZER_X } from './layout';

export interface LineState {
  /** 0..1 build progress of the pallet on the palletizer. */
  progress: number;
  /** Pallet complete and waiting to be wrapped. */
  ready: boolean;
  /** Operator wrapping / releasing the pallet. */
  operatorId: number | null;
  /** Raw-material pallets waiting beside the line. */
  raw: number;
  /** The pallet being built already has its raw material. */
  loaded: boolean;
  /** No raw material: the line is stopped. */
  starved: boolean;
}

/** Sim seconds to fill one pallet with a fully staffed line (= 25 game minutes). */
const PALLET_TIME = 75;
const WRAP_TIME = 2.5;
const FULL_CREW = 4;

export const createLines = (): LineState[] =>
  LINE_Z.map(() => ({ progress: 0.3 + Math.random() * 0.5, ready: false, operatorId: null, raw: LINE_BUFFER, loaded: true, starved: false }));

/** Keep each line's raw buffer topped up: one AGV feed task per missing pallet. */
function requestFeed(w: World, lineIdx: number) {
  const line = w.lines[lineIdx];
  const inFlight =
    w.tasks.filter((t) => t.kind === 'feed' && t.line === lineIdx).length +
    w.rawConveyor.items.filter((it) => it.line === lineIdx).length;
  let missing = LINE_BUFFER - line.raw - inFlight;
  while (missing > 0) {
    const src = reserveFullSlot(w.inventory, 'raw');
    if (!src) return;
    createTask(w, 'feed', { kind: 'rack', ...src }, { kind: 'rawConveyor' }, 'raw', lineIdx);
    missing--;
  }
}

const palletizerStand = (line: number) => ({ x: PALLETIZER_X - 0.4, z: LINE_Z[line] + 1.8 });

function lineCrew(w: World, line: number) {
  return w.workers.filter((p) => p.role === 'production' && p.line === line && p.duty === 'onDuty');
}

function releasePallet(w: World, lineIdx: number, op: Worker) {
  const line = w.lines[lineIdx];
  op.state = 'returnToStation';
  op.route = [{ x: op.post.x, z: op.post.z }];
  op.carry = 'none';
  line.operatorId = null;
  line.ready = false;
  line.progress = 0;
  line.loaded = false;
  insertPallet(w.conveyor, lineIdx);
  w.stats.produced++;
}

/**
 * Each line fills a pallet while operators are at their machines. When it is full, the
 * operator at the last machine walks to the palletizer, stretch-wraps it and pushes it
 * onto the conveyor to the warehouse (waiting if the conveyor is backed up).
 */
export function updateProduction(w: World, dt: number) {
  w.lines.forEach((line, i) => {
    const crew = lineCrew(w, i);
    const atMachines = crew.filter((p) => p.state === 'working').length;

    // Each pallet of product uses one pallet of raw material from the line buffer.
    requestFeed(w, i);
    if (!line.ready && !line.loaded && line.raw > 0) {
      line.raw--;
      line.loaded = true;
    }
    line.starved = !line.ready && !line.loaded;

    if (!line.ready && line.loaded) {
      line.progress += (dt / PALLET_TIME) * Math.min(1, atMachines / FULL_CREW);
      if (line.progress >= 1) {
        line.progress = 1;
        line.ready = true;
      }
    }

    if (line.ready && line.operatorId === null) {
      const op =
        crew.find((p) => p.state === 'working' && p.station === i * 4 + 3) ?? crew.find((p) => p.state === 'working');
      if (op) {
        line.operatorId = op.id;
        op.state = 'toPalletizer';
        op.route = [palletizerStand(i)];
      }
    }

    const op = crew.find((p) => p.id === line.operatorId);
    if (!op) {
      line.operatorId = null;
      return;
    }
    if (op.state === 'toPalletizer' && !op.route.length) {
      op.state = 'wrapping';
      op.timer = WRAP_TIME;
      op.face = Math.PI;
    } else if (op.state === 'wrapping') {
      op.timer -= dt;
      if (op.timer <= 0 && canInsert(w.conveyor, CONVEYOR_INPUTS[i])) releasePallet(w, i, op);
    }
  });

  // Operators walking back from the palletizer.
  for (const p of w.workers) {
    if (p.role === 'production' && p.state === 'returnToStation' && !p.route.length) {
      p.state = 'working';
      p.face = Math.PI;
    }
  }
}
