import { approach, type V2 } from '../../core/math';
import { pushEvent } from '../../world/events';
import type { World } from '../../world/types';
import { hourOfDay, onShift } from '../time/clock';
import { createTask } from '../agv/agv';
import { shipmentOf } from '../orders/orders';
import type { Truck } from '../trucks/trucks';
import { reserveFullSlot } from '../warehouse/inventory';
import { DOCKS } from '../warehouse/layout';
import { QC_POST, onDutyAt, type Worker } from '../workers/workers';

export interface StageSlot {
  full: boolean;
  /** Someone (worker or AGV) is bringing a pallet here or taking it away. */
  reserved: boolean;
  /** Receiving: pallet passed QC and may be put away. */
  checked: boolean;
  inspecting: boolean;
  shipmentId: number | null;
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

export const emptySlot = (): StageSlot => ({ full: false, reserved: false, checked: false, inspecting: false, shipmentId: null });

const DOOR_SPEED = 1 / 1.5;
const PICK_TIME = 1.0;
const DROP_TIME = 0.7;
const QC_TIME = 1.6;

export function createDocks(): DockState[] {
  return DOCKS.map((d) => ({ id: d.id, truckId: null, stage: d.stage.map(emptySlot), requested: 0, door: 0 }));
}

function walkTo(p: Worker, target: V2, state: string) {
  p.route = [{ ...target }];
  p.state = state;
}

function act(p: Worker, state: string, time: number, face: number) {
  p.state = state;
  p.timer = time;
  p.face = face;
}

/** Receiving: truck → staging slot with a hand pallet truck; QC then releases it to the AGVs. */
function receivingWorker(w: World, dock: DockState, truck: Truck | undefined, p: Worker, dt: number) {
  const def = DOCKS[dock.id];
  const walking = p.route.length > 0;
  switch (p.state) {
    case 'idle': {
      if (!truck || truck.phase !== 'docked' || dock.door < 0.95 || truck.cargo <= 0) return;
      const i = dock.stage.findIndex((s) => !s.full && !s.reserved);
      if (i < 0) return;
      dock.stage[i].reserved = true;
      p.job = i;
      walkTo(p, def.doorPos, 'toTruck');
      return;
    }
    case 'toTruck':
      if (!walking) act(p, 'pickTruck', PICK_TIME, 0);
      return;
    case 'pickTruck':
      p.timer -= dt;
      if (p.timer > 0) return;
      if (truck) truck.cargo--;
      p.carry = 'pallet';
      walkTo(p, def.standPos[p.job], 'toStage');
      return;
    case 'toStage':
      if (!walking) act(p, 'dropStage', DROP_TIME, Math.PI);
      return;
    case 'dropStage': {
      p.timer -= dt;
      if (p.timer > 0) return;
      const shipment = shipmentOf(w, truck?.shipmentId ?? null);
      dock.stage[p.job] = { ...emptySlot(), full: true, shipmentId: shipment?.id ?? null };
      if (shipment) shipment.handled++;
      w.stats.received++;
      p.carry = 'none';
      walkTo(p, def.workerHome, 'returning');
      return;
    }
    case 'returning':
      if (!walking) {
        p.state = 'idle';
        p.face = Math.PI;
      }
  }
}

/** Shipping: staging slot (filled by AGV picks) → truck. */
function shippingWorker(w: World, dock: DockState, truck: Truck | undefined, p: Worker, dt: number) {
  const def = DOCKS[dock.id];
  const walking = p.route.length > 0;
  switch (p.state) {
    case 'idle': {
      if (!truck || truck.phase !== 'docked' || dock.door < 0.95 || truck.cargo >= truck.capacity) return;
      const i = dock.stage.findIndex((s) => s.full && !s.reserved);
      if (i < 0) return;
      dock.stage[i].reserved = true;
      p.job = i;
      walkTo(p, def.standPos[p.job], 'toStage');
      return;
    }
    case 'toStage':
      if (!walking) act(p, 'pickStage', DROP_TIME, Math.PI);
      return;
    case 'pickStage':
      p.timer -= dt;
      if (p.timer > 0) return;
      dock.stage[p.job] = emptySlot();
      p.carry = 'pallet';
      walkTo(p, def.doorPos, 'toTruck');
      return;
    case 'toTruck':
      if (!walking) act(p, 'dropTruck', PICK_TIME, 0);
      return;
    case 'dropTruck': {
      p.timer -= dt;
      if (p.timer > 0) return;
      if (truck) truck.cargo++;
      const shipment = shipmentOf(w, truck?.shipmentId ?? null);
      if (shipment) shipment.handled++;
      w.stats.shipped++;
      p.carry = 'none';
      walkTo(p, def.workerHome, 'returning');
      return;
    }
    case 'returning':
      if (!walking) {
        p.state = 'idle';
        p.face = Math.PI;
      }
  }
}

/** Claim the next unchecked pallet on a receiving dock and walk to it. */
function claimInspection(w: World, p: Worker): boolean {
  for (const dock of w.docks) {
    if (DOCKS[dock.id].kind !== 'receiving') continue;
    const i = dock.stage.findIndex((s) => s.full && !s.checked && !s.inspecting);
    if (i < 0) continue;
    dock.stage[i].inspecting = true;
    p.dockId = dock.id;
    p.job = i;
    const at = DOCKS[dock.id].standPos[i];
    p.route = [{ x: p.x, z: QC_POST.z }, { x: at.x + 0.7, z: QC_POST.z }, { x: at.x + 0.7, z: at.z }];
    p.state = 'toPallet';
    p.carry = 'docs';
    return true;
  }
  return false;
}

function backToDesk(p: Worker) {
  p.route = [{ x: p.x, z: QC_POST.z }, QC_POST];
  p.state = 'returning';
}

/**
 * Receiving clerks scan each unloaded pallet against the ASN, then release it for putaway.
 * They go straight from one pallet to the next and only return to the desk when nothing is
 * waiting. During a shift handover the outgoing clerk finishes their scan but takes no new work.
 */
function updateCheckers(w: World, dt: number) {
  const h = hourOfDay(w.time);
  for (const p of w.workers) {
    if (p.role !== 'checker' || p.duty !== 'onDuty') continue;
    const mayStart = onShift(p.shift, h);
    switch (p.state) {
      case 'idle':
        if (mayStart) claimInspection(w, p);
        break;
      case 'returning':
        if (mayStart && claimInspection(w, p)) break;
        if (!p.route.length) {
          p.state = 'idle';
          p.carry = 'none';
          p.face = Math.PI;
        }
        break;
      case 'toPallet':
        if (!p.route.length) act(p, 'inspecting', QC_TIME, Math.PI);
        break;
      case 'inspecting': {
        p.timer -= dt;
        if (p.timer > 0) break;
        const dock = w.docks[p.dockId!];
        const slot = dock.stage[p.job];
        slot.inspecting = false;
        slot.checked = true;
        const shipment = shipmentOf(w, slot.shipmentId);
        if (shipment) {
          shipment.checked++;
          if (shipment.checked === shipment.pallets) {
            pushEvent(w, 'dock', `QC ตรวจรับ ${shipment.ref} ครบ ${shipment.pallets} พาเลท`);
          }
        }
        createTask(w, 'putaway', { kind: 'stage', dock: dock.id, slot: p.job }, null, 'raw');
        if (!(mayStart && claimInspection(w, p))) backToDesk(p);
      }
    }
  }
}

/** Keep enough pick tasks in flight to fill the shipping truck. */
function requestPicks(w: World, dock: DockState, truck: Truck, p: Worker | undefined) {
  const staged = dock.stage.filter((s) => s.full).length;
  let needed = truck.capacity - truck.cargo - staged - dock.requested - (p?.carry === 'pallet' ? 1 : 0);
  while (needed > 0) {
    const i = dock.stage.findIndex((s) => !s.full && !s.reserved);
    if (i < 0) return;
    const src = reserveFullSlot(w.inventory, 'finished');
    if (!src) return;
    dock.stage[i].reserved = true;
    dock.requested++;
    createTask(w, 'pick', { kind: 'rack', ...src }, { kind: 'stage', dock: dock.id, slot: i }, 'finished');
    needed--;
  }
}

export function updateDocks(w: World, dt: number) {
  for (const dock of w.docks) {
    const def = DOCKS[dock.id];
    const truck = w.trucks.find((t) => t.id === dock.truckId);
    const p = onDutyAt(w, (x) => x.role === 'dock' && x.dockId === dock.id);

    const wantOpen = !!truck && truck.phase === 'docked' && !truck.ready;
    dock.door = approach(dock.door, wantOpen ? 1 : 0, DOOR_SPEED * dt);

    if (def.kind === 'shipping') {
      // Picking starts as soon as the truck is called to this dock.
      if (truck) requestPicks(w, dock, truck, p);
      if (p) shippingWorker(w, dock, truck, p, dt);
    } else if (p) {
      receivingWorker(w, dock, truck, p, dt);
    }

    if (truck && truck.phase === 'docked' && !truck.ready) {
      const done =
        def.kind === 'receiving'
          ? truck.cargo === 0 && p?.carry !== 'pallet'
          : truck.cargo >= truck.capacity;
      if (done) {
        truck.ready = true;
        pushEvent(
          w,
          'dock',
          def.kind === 'receiving'
            ? `${def.name}: ขนลง ${truck.plate} ครบ ${truck.capacity} พาเลท รอคนขับเซ็นรับ`
            : `${def.name}: โหลด ${truck.plate} ครบ ${truck.capacity} พาเลท ปิดตู้ รอคนขับ`,
        );
      }
    }
  }
  updateCheckers(w, dt);
}
