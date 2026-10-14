import { forward, type V2 } from '../../core/math';
import { pushEvent } from '../../world/events';
import type { World } from '../../world/types';
import { LOUNGE_DOOR } from '../site/layout';
import { DOCKS } from '../warehouse/layout';
import { makeWorker, type Worker } from '../workers/workers';
import type { Truck } from './trucks';

const DRIVER_NAMES = ['ลุงชาญ', 'พี่หนุ่ม', 'น้าเปี๊ยก', 'พี่ต้อม', 'ลุงสมบัติ', 'พี่เอก', 'น้าแดง', 'พี่โอ๊ต'];
const DOOR_DELAY = 1;
/** Walk lane in front of the truck noses, clear of the reversing arcs. */
const APRON_Z = 31;

/** Every truck comes with a driver, who stays in the cab until the truck is docked. */
export function createDriver(w: World, t: Truck) {
  const p = makeWorker(w, {
    role: 'driver',
    shift: 'always',
    post: { x: t.cab.x, z: t.cab.z },
    vest: '#facc15',
    truckId: t.id,
    speed: 1.3,
  });
  p.name = DRIVER_NAMES[t.id % DRIVER_NAMES.length];
  p.duty = 'onDuty';
  p.state = 'inCab';
}

/** Driver's door (right-hand drive) of a docked truck. */
function cabDoor(t: Truck): V2 {
  const f = forward(t.cab.heading);
  const right = { x: -f.z, z: f.x };
  return { x: t.cab.x + right.x * 1.6 + f.x * 1.8, z: t.cab.z + right.z * 1.6 + f.z * 1.8 };
}

/** Inbound drivers report to the receiving office (west), outbound to the driver lounge (east). */
const officeDoor = (t: Truck): V2 => (t.kind === 'receiving' ? { x: -LOUNGE_DOOR.x, z: LOUNGE_DOOR.z } : LOUNGE_DOOR);

function loungeRoute(t: Truck): V2[] {
  const door = cabDoor(t);
  const lane = DOCKS[t.dockId!].x - 4;
  const office = officeDoor(t);
  return [door, { x: lane, z: door.z }, { x: lane, z: APRON_Z }, { x: office.x, z: APRON_Z }, office];
}

/** Docked → walk to the lounge with the paperwork → wait → walk back once loading/unloading is signed off. */
function updateDriver(w: World, p: Worker, t: Truck, dt: number) {
  switch (p.state) {
    case 'inCab':
      if (t.phase !== 'docked' || t.ready || !t.driverInCab) return;
      p.timer += dt;
      if (p.timer < DOOR_DELAY) return;
      p.timer = 0;
      const door = cabDoor(t);
      p.x = door.x;
      p.z = door.z;
      p.visible = true;
      p.carry = 'docs';
      p.route = loungeRoute(t).slice(1);
      p.state = 'toLounge';
      t.driverInCab = false;
      return;
    case 'toLounge':
      if (p.route.length) return;
      p.visible = false;
      p.state = 'inLounge';
      pushEvent(w, 'dock', `คนขับ ${t.plate} ยื่นเอกสารที่${t.kind === 'receiving' ? 'สำนักงานรับสินค้า' : 'ห้องพักคนขับ'}`);
      return;
    case 'inLounge':
      if (!t.ready) return;
      p.visible = true;
      p.route = loungeRoute(t).reverse().slice(1);
      p.state = 'toCab';
      return;
    case 'toCab':
      if (p.route.length) return;
      p.visible = false;
      p.carry = 'none';
      p.state = 'inCab';
      t.driverInCab = true;
  }
}

export function updateDrivers(w: World, dt: number) {
  for (const p of w.workers) {
    if (p.role !== 'driver') continue;
    const t = w.trucks.find((x) => x.id === p.truckId);
    if (!t) continue;
    if (p.state === 'inCab') {
      p.x = t.cab.x;
      p.z = t.cab.z;
    }
    updateDriver(w, p, t, dt);
  }
}
