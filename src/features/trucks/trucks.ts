import { forward, headingTo, pick, rand, randInt, type V2 } from '../../core/math';
import { Path } from '../../core/path';
import { pushEvent } from '../../world/events';
import type { World } from '../../world/types';
import { DOCKS, type DockKind } from '../warehouse/layout';
import {
  AXLE_TO_REAR,
  CAB_FRONT,
  DESPAWN_X,
  HITCH_TO_AXLE,
  TRAILER_FRONT,
  approachRoute,
  dockToGateRoute,
  exitRoute,
  gateToDockRoute,
  reverseRoute,
} from './routes';

export type TruckPhase =
  | 'arriving'
  | 'gateIn'
  | 'toDock'
  | 'reversing'
  | 'docked'
  | 'departing'
  | 'gateOut'
  | 'leaving';

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
  dockId: number;
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
  timer: number;
  blockedFor: number;
  blockers: number[];
  /** Set by dock operations once loading/unloading is finished. */
  ready: boolean;
  cab: Pose;
  trailer: Pose;
  gateInAt: number | null;
  gone: boolean;
}

const ROAD_SPEED = 11;
const YARD_SPEED = 4.5;
const REVERSE_SPEED = 1.8;
const ACCEL = 2.5;
const BRAKE = 3;
const GATE_CHECK_TIME = 3;
/** Give up yielding after this long so trucks can never lock each other forever. */
const MAX_YIELD = 12;

const COMPANIES = [
  { name: 'สยามขนส่ง', brand: 'Siam Express', color: '#2f55d4' },
  { name: 'ไทยโลจิสติกส์', brand: 'Thai Logistics', color: '#1f2f7a' },
  { name: 'เอเชียคาร์โก้', brand: 'Asia Air Cargo', color: '#3a7bd5' },
  { name: 'ตะวันทรานสปอร์ต', brand: 'Tawan Transport', color: '#d9772b' },
  { name: 'เจริญขนส่ง', brand: 'Charoen Freight', color: '#2b8a6e' },
];

const isMoving = (t: Truck) =>
  t.phase === 'arriving' ||
  t.phase === 'toDock' ||
  t.phase === 'reversing' ||
  t.phase === 'departing' ||
  t.phase === 'leaving';

// ---- Spawning ----------------------------------------------------------

function spawnTruck(w: World, kind: DockKind, dockId: number) {
  const company = pick(COMPANIES);
  const capacity = kind === 'receiving' ? randInt(6, 10) : randInt(5, 9);
  const t: Truck = {
    id: w.nextTruckId++,
    plate: `${randInt(70, 72)}-${randInt(1000, 9999)}`,
    company: company.name,
    brand: company.brand,
    color: company.color,
    kind,
    dockId,
    phase: 'arriving',
    path: new Path(approachRoute()),
    s: 0,
    dir: 1,
    vmax: ROAD_SPEED,
    speed: ROAD_SPEED * 0.8,
    cargo: kind === 'receiving' ? capacity : 0,
    capacity,
    timer: 0,
    blockedFor: 0,
    blockers: [],
    ready: false,
    cab: { x: 0, z: 0, heading: 0 },
    trailer: { x: 0, z: 0, heading: 0 },
    gateInAt: null,
    gone: false,
  };
  updatePose(t);
  w.trucks.push(t);
  w.docks[dockId].truckId = t.id;
  pushEvent(
    w,
    'truck',
    `${t.plate} (${t.company}) กำลังมา${kind === 'receiving' ? 'ส่งสินค้า' : 'รับสินค้า'} → ${DOCKS[dockId].name}`,
  );
}

function trySpawn(w: World, kind: DockKind): boolean {
  const roadBusy = w.trucks.some((t) => t.phase === 'arriving' && t.s < 30);
  if (roadBusy) return false;
  const dock = DOCKS.find((d) => d.kind === kind && w.docks[d.id].truckId === null);
  if (!dock) return false;
  spawnTruck(w, kind, dock.id);
  return true;
}

function updateSpawning(w: World, dt: number) {
  const { inboundEvery, outboundEvery } = w.settings;
  w.spawn.inbound -= dt;
  if (w.spawn.inbound <= 0) w.spawn.inbound = trySpawn(w, 'receiving') ? inboundEvery * rand(0.7, 1.3) : 3;
  w.spawn.outbound -= dt;
  if (w.spawn.outbound <= 0) w.spawn.outbound = trySpawn(w, 'shipping') ? outboundEvery * rand(0.7, 1.3) : 3;
}

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

function leader(t: Truck) {
  if (t.dir === 1) {
    const f = forward(t.cab.heading);
    return { p: { x: t.cab.x + f.x * CAB_FRONT, z: t.cab.z + f.z * CAB_FRONT }, d: f };
  }
  const f = forward(t.trailer.heading);
  return {
    p: { x: t.trailer.x - f.x * AXLE_TO_REAR, z: t.trailer.z - f.z * AXLE_TO_REAR },
    d: { x: -f.x, z: -f.z },
  };
}

function findBlockers(w: World, t: Truck): number[] {
  if (!isMoving(t)) return [];
  const { p, d } = leader(t);
  const look = Math.max(3, 2.5 + t.speed * 1.2);
  const out: number[] = [];
  for (const o of w.trucks) {
    if (o === t || o.gone) continue;
    const hit = bodyPoints(o).some((q) => {
      const rx = q.x - p.x;
      const rz = q.z - p.z;
      const ahead = rx * d.x + rz * d.z;
      const lateral = Math.abs(rx * d.z - rz * d.x);
      return ahead > -0.5 && ahead < look && lateral < 2.3;
    });
    if (hit) out.push(o.id);
  }
  return out;
}

function drive(w: World, t: Truck, dt: number) {
  // Yield, except when the other truck is also yielding to us and we have priority.
  const blocked =
    t.blockedFor < MAX_YIELD &&
    t.blockers.some((id) => {
      const o = w.trucks.find((x) => x.id === id);
      return !(o && o.blockers.includes(t.id) && t.id < o.id);
    });
  t.blockedFor = blocked ? t.blockedFor + dt : 0;

  const remaining = t.path.length - t.s;
  const target = blocked ? 0 : Math.min(t.vmax, Math.sqrt(2 * BRAKE * remaining) + 0.25);
  t.speed = t.speed < target ? Math.min(target, t.speed + ACCEL * dt) : Math.max(target, t.speed - BRAKE * 2 * dt);
  t.s = Math.min(t.path.length, t.s + t.speed * dt);
}

function onLegEnd(w: World, t: Truck) {
  const dock = DOCKS[t.dockId];
  switch (t.phase) {
    case 'arriving':
      t.phase = 'gateIn';
      t.timer = GATE_CHECK_TIME;
      t.speed = 0;
      t.gateInAt = w.time;
      pushEvent(w, 'gate', `${t.plate} ถึงประตู รอ รปภ. ตรวจเอกสาร`);
      break;
    case 'toDock':
      startLeg(t, reverseRoute(dock), -1, REVERSE_SPEED, 'reversing');
      break;
    case 'reversing':
      t.phase = 'docked';
      t.speed = 0;
      pushEvent(w, 'dock', `${t.plate} เข้าเทียบท่า ${dock.name} แล้ว`);
      break;
    case 'departing':
      t.phase = 'gateOut';
      t.timer = 1;
      t.speed = 0;
      break;
    case 'leaving':
      t.gone = true;
      break;
  }
}

export function updateTrucks(w: World, dt: number) {
  updateSpawning(w, dt);

  for (const t of w.trucks) t.blockers = findBlockers(w, t);

  for (const t of w.trucks) {
    switch (t.phase) {
      case 'gateIn':
        t.timer -= dt;
        if (t.timer <= 0 && w.gate.inOpen > 0.95) {
          startLeg(t, gateToDockRoute(DOCKS[t.dockId]), 1, YARD_SPEED, 'toDock');
          pushEvent(w, 'gate', `${t.plate} ผ่านประตูเข้าโรงงาน`);
        }
        break;
      case 'docked':
        if (t.ready && w.docks[t.dockId].door < 0.02) {
          w.docks[t.dockId].truckId = null;
          startLeg(t, dockToGateRoute(DOCKS[t.dockId]), 1, YARD_SPEED, 'departing');
          pushEvent(w, 'dock', `${t.plate} ออกจากท่า ${DOCKS[t.dockId].name}`);
        }
        break;
      case 'gateOut':
        t.timer -= dt;
        if (t.timer <= 0 && w.gate.outOpen > 0.95) {
          startLeg(t, exitRoute(), 1, ROAD_SPEED, 'leaving');
          w.stats.trucksServed++;
          if (t.gateInAt !== null) w.stats.turnarounds.push(w.time - t.gateInAt);
          if (w.stats.turnarounds.length > 50) w.stats.turnarounds.shift();
          pushEvent(w, 'gate', `${t.plate} ออกจากโรงงาน`);
        }
        break;
      default:
        drive(w, t, dt);
        if (t.s >= t.path.length - 1e-3) onLegEnd(w, t);
    }
    updatePose(t);
    if (t.phase === 'leaving' && t.cab.x > DESPAWN_X - 1) t.gone = true;
  }

  if (w.trucks.some((t) => t.gone)) w.trucks = w.trucks.filter((t) => !t.gone);
}

/** Remaining route of a truck's leading point, for path display. */
export function truckRoute(t: Truck): [number, number][] {
  if (!isMoving(t)) return [];
  return t.path.from(t.s).map((p) => [p.x, p.z]);
}
