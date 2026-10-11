import { approach, type V2 } from '../../core/math';
import { pushEvent } from '../../world/events';
import type { World } from '../../world/types';
import { createTask } from '../agv/agv';
import type { Truck } from '../trucks/trucks';
import { reserveFullSlot } from '../warehouse/inventory';
import { DOCKS } from '../warehouse/layout';
import type { Worker } from '../workers/workers';

export interface StageSlot {
  full: boolean;
  reserved: boolean;
}

export interface DockState {
  id: number;
  /** Truck assigned to (en route to, or at) this dock. */
  truckId: number | null;
  stage: StageSlot[];
  /** Pick tasks in flight towards this dock's staging slots. */
  requested: number;
  /** Roll-up door, 0 closed .. 1 open. */
  door: number;
}

const DOOR_SPEED = 1 / 1.5;
const PICK_TIME = 1.0;
const DROP_TIME = 0.7;

export function createDocks(): DockState[] {
  return DOCKS.map((d) => ({
    id: d.id,
    truckId: null,
    stage: d.stage.map(() => ({ full: false, reserved: false })),
    requested: 0,
    door: 0,
  }));
}

function walkTo(worker: Worker, target: V2, state: string) {
  worker.route = [{ ...target }];
  worker.state = state;
}

function act(worker: Worker, state: string, time: number, face: number) {
  worker.state = state;
  worker.timer = time;
  worker.face = face;
}

/** Receiving: truck → staging slot, then hand the pallet to an AGV putaway task. */
function receivingWorker(w: World, dock: DockState, truck: Truck | undefined, worker: Worker, dt: number) {
  const def = DOCKS[dock.id];
  const walking = worker.route.length > 0;
  switch (worker.state) {
    case 'idle': {
      if (!truck || truck.phase !== 'docked' || dock.door < 0.95 || truck.cargo <= 0) return;
      const i = dock.stage.findIndex((s) => !s.full && !s.reserved);
      if (i < 0) return;
      dock.stage[i].reserved = true;
      worker.job = i;
      walkTo(worker, def.doorPos, 'toTruck');
      return;
    }
    case 'toTruck':
      if (!walking) act(worker, 'pickTruck', PICK_TIME, 0);
      return;
    case 'pickTruck':
      worker.timer -= dt;
      if (worker.timer > 0) return;
      if (truck) truck.cargo--;
      w.stats.received++;
      worker.carrying = true;
      walkTo(worker, def.standPos[worker.job], 'toStage');
      return;
    case 'toStage':
      if (!walking) act(worker, 'dropStage', DROP_TIME, Math.PI);
      return;
    case 'dropStage':
      worker.timer -= dt;
      if (worker.timer > 0) return;
      dock.stage[worker.job] = { full: true, reserved: false };
      worker.carrying = false;
      createTask(w, 'putaway', { kind: 'stage', dock: dock.id, slot: worker.job }, null);
      walkTo(worker, def.workerHome, 'returning');
      return;
    case 'returning':
      if (!walking) {
        worker.state = 'idle';
        worker.face = Math.PI;
      }
  }
}

/** Shipping: staging slot (filled by AGV picks) → truck. */
function shippingWorker(w: World, dock: DockState, truck: Truck | undefined, worker: Worker, dt: number) {
  const def = DOCKS[dock.id];
  const walking = worker.route.length > 0;
  switch (worker.state) {
    case 'idle': {
      if (!truck || truck.phase !== 'docked' || dock.door < 0.95 || truck.cargo >= truck.capacity) return;
      const i = dock.stage.findIndex((s) => s.full && !s.reserved);
      if (i < 0) return;
      dock.stage[i].reserved = true;
      worker.job = i;
      walkTo(worker, def.standPos[worker.job], 'toStage');
      return;
    }
    case 'toStage':
      if (!walking) act(worker, 'pickStage', DROP_TIME, Math.PI);
      return;
    case 'pickStage':
      worker.timer -= dt;
      if (worker.timer > 0) return;
      dock.stage[worker.job] = { full: false, reserved: false };
      worker.carrying = true;
      walkTo(worker, def.doorPos, 'toTruck');
      return;
    case 'toTruck':
      if (!walking) act(worker, 'dropTruck', PICK_TIME, 0);
      return;
    case 'dropTruck':
      worker.timer -= dt;
      if (worker.timer > 0) return;
      if (truck) truck.cargo++;
      w.stats.shipped++;
      worker.carrying = false;
      walkTo(worker, def.workerHome, 'returning');
      return;
    case 'returning':
      if (!walking) {
        worker.state = 'idle';
        worker.face = Math.PI;
      }
  }
}

/** Keep enough pick tasks in flight to fill the shipping truck. */
function requestPicks(w: World, dock: DockState, truck: Truck, worker: Worker) {
  const staged = dock.stage.filter((s) => s.full).length;
  let needed = truck.capacity - truck.cargo - staged - dock.requested - (worker.carrying ? 1 : 0);
  while (needed > 0) {
    const i = dock.stage.findIndex((s) => !s.full && !s.reserved);
    if (i < 0) return;
    const src = reserveFullSlot(w.inventory);
    if (!src) return;
    dock.stage[i].reserved = true;
    dock.requested++;
    createTask(w, 'pick', { kind: 'rack', ...src }, { kind: 'stage', dock: dock.id, slot: i });
    needed--;
  }
}

export function updateDocks(w: World, dt: number) {
  for (const dock of w.docks) {
    const def = DOCKS[dock.id];
    const truck = w.trucks.find((t) => t.id === dock.truckId);
    const worker = w.workers.find((p) => p.role === 'dock' && p.dockId === dock.id)!;

    const wantOpen = !!truck && truck.phase === 'docked' && !truck.ready;
    dock.door = approach(dock.door, wantOpen ? 1 : 0, DOOR_SPEED * dt);

    if (def.kind === 'shipping') {
      // Pre-stage pallets as soon as the truck has checked in at the gate.
      if (truck && truck.phase !== 'arriving') requestPicks(w, dock, truck, worker);
      shippingWorker(w, dock, truck, worker, dt);
    } else {
      receivingWorker(w, dock, truck, worker, dt);
    }

    if (truck && truck.phase === 'docked' && !truck.ready) {
      const done =
        def.kind === 'receiving'
          ? truck.cargo === 0 && (worker.state === 'idle' || worker.state === 'returning')
          : truck.cargo >= truck.capacity;
      if (done) {
        truck.ready = true;
        pushEvent(
          w,
          'dock',
          def.kind === 'receiving'
            ? `${def.name}: ขนลง ${truck.plate} ครบ ${truck.capacity} พาเลท`
            : `${def.name}: โหลดขึ้น ${truck.plate} ครบ ${truck.capacity} พาเลท`,
        );
      }
    }
  }
}
