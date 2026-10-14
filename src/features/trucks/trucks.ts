import { forward, headingTo, pick, randInt, type V2 } from '../../core/math';
import { Path } from '../../core/path';
import { pushEvent } from '../../world/events';
import type { World } from '../../world/types';
import { facilityById, truckArrival, truckDeparture } from '../city/layout';
import { shipmentOf, type Shipment } from '../orders/orders';
import { edgePoint, planRoute, type RouteGoal, type RouteStart } from '../roads/network';
import { WEST_BAY_X } from '../site/layout';
import { deliverToStore } from '../stores/stores';
import { closeSupplierOrder, collectFrom } from '../suppliers/suppliers';
import { minutes } from '../time/clock';
import { mustYield, type Agent } from '../traffic/collision';
import { signalSpeedCap, stopLinesFor, type StopLine } from '../traffic/signals';
import { DOCKS, type DockKind } from '../warehouse/layout';
import { createDriver } from './drivers';
import {
  AXLE_TO_REAR,
  CAB_FRONT,
  FACTORY_ENTRY,
  FACTORY_EXIT,
  HIGHWAY_GOAL,
  HIGHWAY_START,
  HITCH_TO_AXLE,
  TRAILER_FRONT,
  bayToDockRoute,
  checkoutToGateRoute,
  dockToCheckoutRoute,
  dockToGateRoute,
  gateToBayRoute,
  gateToDockRoute,
  reverseRoute,
} from './routes';

export type TruckPhase =
  | 'toSupplier'
  | 'atSupplier'
  | 'arriving'
  | 'gateIn'
  | 'toBay'
  | 'waiting'
  | 'toDock'
  | 'reversing'
  | 'docked'
  | 'toCheckout'
  | 'checkout'
  | 'departing'
  | 'gateOut'
  | 'toStore'
  | 'atStore'
  | 'toHighway';

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

export interface Truck {
  id: number;
  plate: string;
  company: string;
  /** Latin brand painted on the trailer. */
  brand: string;
  color: string;
  kind: DockKind;
  shipmentId: number;
  /** Supplier (receiving) or store (shipping) this truck serves in town. */
  facilityId: string;
  /** Signal stop lines on the current leg (empty inside the factory). */
  stops: StopLine[];
  /** Assigned dock (null while queued). */
  dockId: number | null;
  /** West holding bay while queued. */
  bay: number | null;
  /** East check-out bay while being weighed / sealed. */
  checkoutBay: number | null;
  timer: number;
  phase: TruckPhase;
  path: Path;
  /** Arc length of the leading point along `path`. */
  s: number;
  /** 1 = driving forward (cab leads), -1 = reversing (trailer leads). */
  dir: 1 | -1;
  vmax: number;
  speed: number;
  cargo: number;
  capacity: number;
  blockedFor: number;
  /** Seconds left of driving through blockers after giving up yielding. */
  ghostFor: number;
  blockers: number[];
  /** Guard has checked the paperwork at the current barrier. */
  cleared: boolean;
  /** Dock work finished; waiting for the door and the driver. */
  ready: boolean;
  driverInCab: boolean;
  cab: Pose;
  trailer: Pose;
  /** When the truck reached the gate (start of the queue clock). */
  gateInAt: number | null;
  dockedAt: number | null;
  gone: boolean;
}

const ROAD_SPEED = 11;
const YARD_SPEED = 4.5;
const REVERSE_SPEED = 1.8;
const ACCEL = 2.5;
const BRAKE = 3;
/** Loading at a supplier / unloading at a store (sim seconds). */
const SUPPLIER_LOAD_TIME = minutes(20);
const STORE_UNLOAD_TIME = minutes(25);

const COMPANIES = [
  { name: 'สยามขนส่ง', brand: 'Siam Express', color: '#2f55d4' },
  { name: 'ไทยโลจิสติกส์', brand: 'Thai Logistics', color: '#1f2f7a' },
  { name: 'เอเชียคาร์โก้', brand: 'Asia Air Cargo', color: '#3a7bd5' },
  { name: 'ตะวันทรานสปอร์ต', brand: 'Tawan Transport', color: '#d9772b' },
  { name: 'เจริญขนส่ง', brand: 'Charoen Freight', color: '#2b8a6e' },
];

const isMoving = (t: Truck) =>
  t.phase === 'toSupplier' ||
  t.phase === 'toStore' ||
  t.phase === 'toHighway' ||
  t.phase === 'arriving' ||
  t.phase === 'toBay' ||
  t.phase === 'toDock' ||
  t.phase === 'reversing' ||
  t.phase === 'toCheckout' ||
  t.phase === 'departing';

/** Trucks out in town rather than inside the factory fence. */
export const inTown = (t: Truck) =>
  t.phase === 'toSupplier' || t.phase === 'atSupplier' || t.phase === 'toStore' || t.phase === 'atStore' || t.phase === 'toHighway';

export const dockName = (t: Truck) => (t.dockId === null ? null : DOCKS[t.dockId].name);
export const bayName = (bay: number) => `P${bay + 1}`;
export const checkoutName = (bay: number) => `C${bay + 1}`;
/** Weighbridge + seal / paperwork check before leaving (game minutes). */
const CHECKOUT_TIME = minutes(12);

// ---- Arrivals ----------------------------------------------------------

function spawnTruck(w: World, s: Shipment) {
  const company = pick(COMPANIES);
  const f = facilityById.get(s.facilityId)!;
  const route = planRoute([HIGHWAY_START], s.kind === 'receiving' ? [truckArrival(f)] : FACTORY_ENTRY);
  if (!route) return;
  const path = new Path(route.points);
  const t: Truck = {
    id: w.nextTruckId++,
    plate: `${randInt(70, 72)}-${randInt(1000, 9999)}`,
    company: company.name,
    brand: company.brand,
    color: company.color,
    kind: s.kind,
    shipmentId: s.id,
    facilityId: s.facilityId,
    stops: stopLinesFor(path, route.junctions),
    dockId: null,
    bay: null,
    checkoutBay: null,
    timer: 0,
    phase: s.kind === 'receiving' ? 'toSupplier' : 'arriving',
    path,
    s: 0,
    dir: 1,
    vmax: ROAD_SPEED,
    speed: ROAD_SPEED * 0.8,
    // Inbound trucks arrive empty and load at the supplier; outbound arrive empty to load here.
    cargo: 0,
    capacity: s.pallets,
    blockedFor: 0,
    ghostFor: 0,
    blockers: [],
    cleared: false,
    ready: false,
    driverInCab: true,
    cab: { x: 0, z: 0, heading: 0 },
    trailer: { x: 0, z: 0, heading: 0 },
    gateInAt: null,
    dockedAt: null,
    gone: false,
  };
  updatePose(t);
  w.trucks.push(t);
  s.truckId = t.id;
  createDriver(w, t);
}

/** Trucks set off from the highway for their booked shipments, one at a time. */
function updateArrivals(w: World) {
  const spawn = edgePoint(HIGHWAY_START.edge, 0);
  const near = (p: { x: number; z: number }) => Math.hypot(p.x - spawn.x, p.z - spawn.z) < 30;
  if (w.trucks.some((t) => near(t.trailer) || near(t.cab)) || w.cars.some((c) => near(c))) return;
  const due = w.shipments
    .filter((s) => s.truckId === null && s.closedAt === null && s.eta <= w.time)
    .sort((a, b) => a.eta - b.eta)[0];
  if (due) spawnTruck(w, due);
}

// ---- Queue / dispatch --------------------------------------------------

/** Call the longest-waiting truck of the right kind to every free dock (FIFO by gate arrival). */
function dispatch(w: World) {
  for (const dock of w.docks) {
    if (dock.truckId !== null) continue;
    const def = DOCKS[dock.id];
    const next = w.trucks
      .filter(
        (t) =>
          t.kind === def.kind &&
          t.dockId === null &&
          (t.phase === 'waiting' || (t.phase === 'gateIn' && t.cleared)),
      )
      .sort((a, b) => (a.gateInAt ?? 0) - (b.gateInAt ?? 0))[0];
    if (!next) continue;

    dock.truckId = next.id;
    next.dockId = dock.id;
    if (next.gateInAt !== null) w.stats.queueWaits.push(w.time - next.gateInAt);
    if (w.stats.queueWaits.length > 50) w.stats.queueWaits.shift();

    if (next.phase === 'waiting' && next.bay !== null) {
      pushEvent(w, 'truck', `เรียก ${next.plate} จากลานพัก ${bayName(next.bay)} เข้าท่า ${def.name}`);
      startLeg(next, bayToDockRoute(next.bay, def), 1, YARD_SPEED, 'toDock');
      w.bays[next.bay] = null;
      next.bay = null;
    }
  }
}

/** After the gate check: straight to an assigned dock, else into a holding bay, else wait at the barrier. */
function leaveGate(w: World, t: Truck) {
  if (t.dockId === null && t.bay === null) {
    const free = w.bays.findIndex((b) => b === null);
    if (free < 0) return; // park full: hold at the gate, traffic queues behind
    t.bay = free;
    w.bays[free] = t.id;
  }
  if (w.gate.inOpen < 0.95) return;
  if (t.dockId !== null) {
    // Called to a dock while still at the gate: give back any bay it had reserved.
    if (t.bay !== null) {
      w.bays[t.bay] = null;
      t.bay = null;
    }
    startLeg(t, gateToDockRoute(DOCKS[t.dockId]), 1, YARD_SPEED, 'toDock');
    pushEvent(w, 'gate', `${t.plate} เข้าโรงงาน → ท่า ${DOCKS[t.dockId].name}`);
  } else if (t.bay !== null) {
    startLeg(t, gateToBayRoute(t.bay), 1, YARD_SPEED, 'toBay');
    pushEvent(w, 'gate', `${t.plate} เข้าโรงงาน → รอคิวที่ลานพัก ${bayName(t.bay)}`);
  }
}

/** Whether the inbound barrier should lift for this truck. */
export const readyToEnter = (w: World, t: Truck) =>
  t.phase === 'gateIn' && t.cleared && (t.dockId !== null || t.bay !== null || w.bays.some((b) => b === null));

// ---- Motion ------------------------------------------------------------

/**
 * Start a new leg. The final HITCH_TO_AXLE metres of the previous path are kept as a prefix
 * (reversed when the driving direction flips) so both cab and trailer continue without jumping.
 */
function startLeg(t: Truck, pts: V2[], dir: 1 | -1, vmax: number, phase: TruckPhase) {
  const tail = t.path.tail(HITCH_TO_AXLE);
  const prefix = t.dir === dir ? tail : [...tail].reverse();
  t.path = new Path([...prefix, ...pts]);
  t.s = new Path(prefix).length;
  if (t.dir !== dir) t.speed = 0;
  t.dir = dir;
  t.vmax = vmax;
  t.phase = phase;
  t.stops = [];
}

/** A leg on the town road network: plan it, then obey signals along it. */
function startTownLeg(w: World, t: Truck, starts: RouteStart[], goals: RouteGoal[], phase: TruckPhase) {
  const route = planRoute(starts, goals);
  if (!route) {
    pushEvent(w, 'truck', `${t.plate} หาเส้นทางไม่ได้`);
    t.gone = true;
    return;
  }
  startLeg(t, route.points, 1, ROAD_SPEED, phase);
  t.stops = stopLinesFor(t.path, route.junctions);
}

function updatePose(t: Truck) {
  const lead = t.path.at(t.s);
  const follow = t.path.at(t.s - HITCH_TO_AXLE);
  const hitch = t.dir === 1 ? lead : follow;
  const axle = t.dir === 1 ? follow : lead;
  const d = t.path.dirAt(t.dir === 1 ? t.s : t.s - HITCH_TO_AXLE);
  t.cab = { x: hitch.x, z: hitch.z, heading: Math.atan2(d.x * t.dir, d.z * t.dir) };
  t.trailer = { x: axle.x, z: axle.z, heading: headingTo(axle, hitch) };
}

/** Outline sample points used for collision checks. */
function bodyPoints(t: Truck): V2[] {
  const cf = forward(t.cab.heading);
  const tf = forward(t.trailer.heading);
  const { cab, trailer } = t;
  return [
    { x: cab.x + cf.x * CAB_FRONT, z: cab.z + cf.z * CAB_FRONT },
    { x: cab.x, z: cab.z },
    { x: cab.x + tf.x * TRAILER_FRONT, z: cab.z + tf.z * TRAILER_FRONT },
    { x: trailer.x + tf.x * 3.5, z: trailer.z + tf.z * 3.5 },
    { x: trailer.x, z: trailer.z },
    { x: trailer.x - tf.x * AXLE_TO_REAR, z: trailer.z - tf.z * AXLE_TO_REAR },
  ];
}

/** This truck as a traffic agent (shared with town cars for collision avoidance). */
export function truckAgent(t: Truck): Agent {
  const cf = forward(t.cab.heading);
  const tf = forward(t.trailer.heading);
  const reversing = t.dir === -1;
  const lead = reversing
    ? { x: t.trailer.x - tf.x * AXLE_TO_REAR, z: t.trailer.z - tf.z * AXLE_TO_REAR }
    : { x: t.cab.x + cf.x * CAB_FRONT, z: t.cab.z + cf.z * CAB_FRONT };
  const dir = reversing ? { x: -tf.x, z: -tf.z } : cf;
  return { id: t.id, moving: isMoving(t), lead, dir, look: Math.max(3, 2.5 + t.speed * 1.2), points: bodyPoints(t), fwd: dir };
}

function drive(w: World, t: Truck, dt: number) {
  const blocked = mustYield(w, t, dt);
  const remaining = t.path.length - t.s;
  let target = blocked ? 0 : Math.min(t.vmax, Math.sqrt(2 * BRAKE * remaining) + 0.25);
  // Stop with the cab's nose (not the hitch) at the line.
  target = Math.min(target, signalSpeedCap(w, t.stops, t.s + CAB_FRONT, t.speed, BRAKE));
  t.speed = t.speed < target ? Math.min(target, t.speed + ACCEL * dt) : Math.max(target, t.speed - BRAKE * 2 * dt);
  t.s = Math.min(t.path.length, t.s + t.speed * dt);
}

function onLegEnd(w: World, t: Truck) {
  t.speed = 0;
  const f = facilityById.get(t.facilityId)!;
  switch (t.phase) {
    case 'toSupplier':
      t.phase = 'atSupplier';
      t.timer = SUPPLIER_LOAD_TIME;
      pushEvent(w, 'truck', `${t.plate} ถึง ${f.name} กำลังขึ้นวัตถุดิบ`);
      break;
    case 'arriving':
      t.phase = 'gateIn';
      t.cleared = false;
      t.gateInAt = w.time;
      pushEvent(w, 'gate', `${t.plate} ถึงประตู รอ รปภ. ตรวจเอกสาร`);
      break;
    case 'toBay':
      t.phase = 'waiting';
      break;
    case 'toDock':
      startLeg(t, reverseRoute(DOCKS[t.dockId!]), -1, REVERSE_SPEED, 'reversing');
      break;
    case 'reversing':
      t.phase = 'docked';
      t.dockedAt = w.time;
      pushEvent(w, 'dock', `${t.plate} เข้าเทียบท่า ${DOCKS[t.dockId!].name} แล้ว`);
      break;
    case 'toCheckout':
      t.phase = 'checkout';
      t.timer = CHECKOUT_TIME;
      pushEvent(w, 'truck', `${t.plate} ชั่งน้ำหนักขาออกและตรวจซีลที่ลาน ${checkoutName(t.checkoutBay!)}`);
      break;
    case 'departing':
      t.phase = 'gateOut';
      t.cleared = false;
      break;
    case 'toStore':
      t.phase = 'atStore';
      t.timer = STORE_UNLOAD_TIME;
      pushEvent(w, 'truck', `${t.plate} ถึง ${f.name} กำลังลงสินค้า`);
      break;
    case 'toHighway':
      t.gone = true;
      break;
  }
}

function closeVisit(w: World, t: Truck) {
  w.stats.trucksServed++;
  if (t.gateInAt !== null) w.stats.turnarounds.push(w.time - t.gateInAt);
  if (w.stats.turnarounds.length > 50) w.stats.turnarounds.shift();
  const s = shipmentOf(w, t.shipmentId);
  // Purchase orders are complete once the goods are in; sales orders when the store has them.
  if (s && t.kind === 'receiving') s.closedAt = w.time;
  pushEvent(w, 'gate', `${t.plate} ตรวจออกแล้ว ออกจากโรงงาน`);
}

export function updateTrucks(w: World, dt: number) {
  updateArrivals(w);
  dispatch(w);

  for (const t of w.trucks) {
    const f = facilityById.get(t.facilityId)!;
    switch (t.phase) {
      case 'atSupplier':
        t.timer -= dt;
        if (t.timer <= 0 && collectFrom(w, f.id, t.capacity)) {
          t.cargo = t.capacity;
          closeSupplierOrder(w, t.shipmentId);
          pushEvent(w, 'truck', `${t.plate} รับวัตถุดิบ ${t.capacity} พาเลทจาก ${f.name} มุ่งหน้าโรงงาน`);
          startTownLeg(w, t, [truckDeparture(f)], FACTORY_ENTRY, 'arriving');
        }
        break;
      case 'gateIn':
        if (t.cleared) leaveGate(w, t);
        break;
      case 'waiting':
        break;
      case 'docked': {
        const dock = w.docks[t.dockId!];
        if (t.ready && t.driverInCab && dock.door < 0.02) {
          dock.truckId = null;
          const def = DOCKS[t.dockId!];
          pushEvent(w, 'dock', `${t.plate} ออกจากท่า ${def.name}`);
          const free = w.checkoutBays.findIndex((b) => b === null);
          if (free >= 0) {
            t.checkoutBay = free;
            w.checkoutBays[free] = t.id;
            startLeg(t, dockToCheckoutRoute(def, free), 1, YARD_SPEED, 'toCheckout');
          } else {
            startLeg(t, dockToGateRoute(def), 1, YARD_SPEED, 'departing');
          }
        }
        break;
      }
      case 'checkout':
        t.timer -= dt;
        if (t.timer <= 0) {
          w.checkoutBays[t.checkoutBay!] = null;
          startLeg(t, checkoutToGateRoute(t.checkoutBay!), 1, YARD_SPEED, 'departing');
          t.checkoutBay = null;
        }
        break;
      case 'gateOut':
        if (t.cleared && w.gate.outOpen > 0.95) {
          closeVisit(w, t);
          if (t.kind === 'shipping') startTownLeg(w, t, FACTORY_EXIT, [truckArrival(f)], 'toStore');
          else startTownLeg(w, t, FACTORY_EXIT, [HIGHWAY_GOAL], 'toHighway');
        }
        break;
      case 'atStore':
        t.timer -= dt;
        if (t.timer <= 0) {
          deliverToStore(w, f.id, t.cargo);
          const s = shipmentOf(w, t.shipmentId);
          if (s) s.closedAt = w.time;
          pushEvent(w, 'truck', `${t.plate} ส่ง ${t.cargo} พาเลทถึง ${f.name} เรียบร้อย`);
          t.cargo = 0;
          startTownLeg(w, t, [truckDeparture(f)], [HIGHWAY_GOAL], 'toHighway');
        }
        break;
      default:
        drive(w, t, dt);
        if (t.s >= t.path.length - 1e-3) onLegEnd(w, t);
    }
    updatePose(t);
  }

  if (w.trucks.some((t) => t.gone)) {
    const gone = new Set(w.trucks.filter((t) => t.gone).map((t) => t.id));
    w.trucks = w.trucks.filter((t) => !t.gone);
    w.workers = w.workers.filter((p) => !(p.role === 'driver' && p.truckId !== null && gone.has(p.truckId)));
  }
}

/** Remaining route of a truck's leading point, for path display. */
export function truckRoute(t: Truck): [number, number][] {
  if (!isMoving(t)) return [];
  return t.path.from(t.s).map((p) => [p.x, p.z]);
}

export const BAY_COUNT = WEST_BAY_X.length;
