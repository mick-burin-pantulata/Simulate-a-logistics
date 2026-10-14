import { headingTo, lerpAngle, rand, stepToward, type V2 } from '../../core/math';
import { pushEvent } from '../../world/events';
import type { World } from '../../world/types';
import { STATIONS } from '../production/layout';
import { carSpot, driveHome, driveToWork, parkedAt } from '../residential/residents';
import { ENTRY_GATE, EXIT_GATE, GUARD_HOUSES, WALK_NODES, walkRoute } from '../site/layout';
import { currentShift, hourOfDay, minutes, onShift, type ShiftKind } from '../time/clock';
import { DOCKS } from '../warehouse/layout';

export type WorkerRole = 'dock' | 'checker' | 'production' | 'office' | 'guard' | 'driver';
/** Where a person is in their working day. */
export type Duty = 'home' | 'commuting' | 'onDuty' | 'leaving';
export type Carry = 'none' | 'pallet' | 'docs';

export interface Worker {
  id: number;
  name: string;
  role: WorkerRole;
  shift: ShiftKind;
  duty: Duty;
  x: number;
  z: number;
  heading: number;
  /** Waypoints still to walk to. */
  route: V2[];
  speed: number;
  moving: boolean;
  /** False while at home, inside a building, or in a truck cab. */
  visible: boolean;
  carry: Carry;
  /** Role-specific activity (see labels). */
  state: string;
  timer: number;
  /** Heading to turn to while standing still. */
  face: number | null;
  /** Animation clock (walk cycle / working motion). */
  phase: number;
  vest: string;
  /** Where this person reports for duty. */
  post: V2;
  dockId: number | null;
  line: number | null;
  station: number | null;
  truckId: number | null;
  /** Role-specific index (e.g. staging slot being handled). */
  job: number;
  /** Which side's car park and building door this person uses. */
  side: 'W' | 'E';
  /** Guards only: which gate they man. */
  gateSide: 'entry' | 'exit' | null;
  /** Home facility and its parking spot, and the car this person drives to work. */
  homeId: string | null;
  homeSpot: number;
  carId: number | null;
  /** Hour of day this person takes their meal break (null = no break). */
  breakAt: number | null;
  breakTaken: boolean;
}

const NAMES = [
  'สมชาย', 'สมหญิง', 'วิชัย', 'มานี', 'ประเสริฐ', 'สุดา', 'อนันต์', 'กมล', 'ปรีชา', 'วันดี', 'สมศักดิ์',
  'นภา', 'ธีระ', 'จันทร์เพ็ญ', 'บุญมี', 'ศิริพร', 'อำนาจ', 'พรทิพย์', 'ชาตรี', 'ลำดวน', 'ยุทธนา', 'ดวงใจ',
  'เกียรติ', 'อรุณี', 'สุรชัย', 'ปิยะ', 'รัตนา', 'ไพโรจน์', 'กาญจนา', 'สมพร', 'ทองดี', 'อุไร', 'วีระ', 'เพ็ญศรี',
];

/** Game hours before a shift that people start walking in. */
const COMMUTE_LEAD_H = 0.5;
const BREAK_LENGTH = minutes(30);
/** QC desk sits between receiving doors R2 and R3. */
export const QC_POST: V2 = { x: -9, z: 15.3 };
/** Each gate has its own guard; they stand on the lane side of their booth. */
export const GUARD_POSTS: Record<'entry' | 'exit', V2> = {
  entry: { x: GUARD_HOUSES.entry.x - GUARD_HOUSES.entry.w / 2 - 1, z: GUARD_HOUSES.entry.z },
  exit: { x: GUARD_HOUSES.exit.x + GUARD_HOUSES.exit.w / 2 + 1, z: GUARD_HOUSES.exit.z },
};
/** Beside the driver's (right-hand) window of a truck waiting at each barrier. */
const GATE_CHECK: Record<'entry' | 'exit', V2> = {
  entry: { x: ENTRY_GATE.x + 2.5, z: ENTRY_GATE.z + 3.5 },
  exit: { x: EXIT_GATE.x - 2.5, z: EXIT_GATE.z - 4.5 },
};
const GUARD_FACE = { entry: -Math.PI / 2, exit: Math.PI / 2 };
const GUARD_CHECK_TIME = 3;

const warehouseEntry = (side: 'W' | 'E'): V2[] => {
  const x = side === 'W' ? -23.5 : 23.5;
  return [
    { x, z: 0 },
    { x, z: 15.3 },
  ];
};
/** Just inside the production hall door, north of the raw-material conveyor's end. */
const PRODUCTION_ENTRY: V2 = { x: -23, z: -47 };

// ---- Construction ------------------------------------------------------

export function makeWorker(w: World, init: Partial<Worker> & Pick<Worker, 'role' | 'shift' | 'post' | 'vest'>): Worker {
  const id = w.nextWorkerId++;
  const worker: Worker = {
    id,
    name: NAMES[id % NAMES.length],
    x: init.post.x,
    z: init.post.z,
    heading: 0,
    route: [],
    speed: 1.4,
    moving: false,
    visible: false,
    carry: 'none',
    state: 'idle',
    timer: 0,
    face: null,
    phase: Math.random() * 10,
    dockId: null,
    line: null,
    station: null,
    truckId: null,
    job: 0,
    breakAt: null,
    breakTaken: false,
    side: 'W',
    gateSide: null,
    homeId: null,
    homeSpot: 0,
    carId: null,
    duty: 'home',
    ...init,
  };
  w.workers.push(worker);
  return worker;
}

/** The standing crew of every shift. Drivers are added as trucks arrive. */
export function createStaff(w: World) {
  for (const shift of ['day', 'night'] as const) {
    for (const d of DOCKS) {
      makeWorker(w, {
        role: 'dock',
        shift,
        post: d.workerHome,
        vest: '#f97316',
        dockId: d.id,
        speed: 1.7,
        face: Math.PI,
        side: d.x < 0 ? 'W' : 'E',
      });
    }
    makeWorker(w, { role: 'checker', shift, post: QC_POST, vest: '#a3e635', face: Math.PI });
    STATIONS.forEach((s, i) =>
      makeWorker(w, {
        role: 'production',
        shift,
        post: { x: s.x, z: s.z },
        vest: '#38bdf8',
        line: s.line,
        station: i,
        face: Math.PI,
        side: i % 2 ? 'E' : 'W',
        // Half the line eats in the first slot, half in the second, so the line keeps running.
        breakAt: (shift === 'day' ? 11.5 : 23.5) + (i % 2) * 0.75,
      }),
    );
  }
  for (let i = 0; i < 6; i++) {
    makeWorker(w, { role: 'office', shift: 'office', post: WALK_NODES.office, vest: '#e2e8f0', breakAt: 11.9 + rand(0, 0.5) });
  }
  for (const gate of ['entry', 'exit'] as const) {
    makeWorker(w, { role: 'guard', shift: 'always', post: GUARD_POSTS[gate], vest: '#1e3a8a', gateSide: gate, face: GUARD_FACE[gate] });
  }

  // Whoever is on shift at start-up is already at their post.
  const h = hourOfDay(w.time);
  for (const p of w.workers) {
    if (p.role !== 'driver' && onShift(p.shift, h)) arriveAtPost(p);
  }
}

// ---- Routes ------------------------------------------------------------

function inside(p: Worker): V2[] {
  if (p.role === 'dock' || p.role === 'checker') return [...warehouseEntry(p.side), p.post];
  if (p.role === 'production') return [PRODUCTION_ENTRY, { x: PRODUCTION_ENTRY.x, z: p.post.z }, p.post];
  return [];
}

function doorOf(p: Worker) {
  if (p.role === 'production') return 'productionDoor';
  if (p.role === 'office') return 'office';
  return p.side === 'W' ? 'warehouseDoorW' : 'warehouseDoorE';
}

/** Parking lot → building door → post. */
const lotOf = (p: Worker) => (p.side === 'W' ? 'parkingLotW' : 'parkingLotE');

function commuteRoute(p: Worker): V2[] {
  return [...walkRoute(lotOf(p), doorOf(p)), ...inside(p)];
}

/** Post → building door → parking lot. */
function homeRoute(p: Worker): V2[] {
  const there = [WALK_NODES[lotOf(p)], ...commuteRoute(p)];
  return there.reverse().slice(1);
}

function breakRoute(p: Worker): V2[] {
  if (p.role === 'production') {
    return [{ x: PRODUCTION_ENTRY.x, z: p.post.z }, PRODUCTION_ENTRY, ...walkRoute('productionDoor', 'canteen')];
  }
  return walkRoute('office', 'canteen');
}

function backFromBreak(p: Worker): V2[] {
  if (p.role === 'production') return [...walkRoute('canteen', 'productionDoor'), ...inside(p)];
  return walkRoute('canteen', 'office');
}

// ---- Duty cycle --------------------------------------------------------

function arriveAtPost(p: Worker) {
  p.duty = 'onDuty';
  p.x = p.route.length ? p.x : p.post.x;
  p.z = p.route.length ? p.z : p.post.z;
  p.route = [];
  p.visible = p.role !== 'office';
  p.state = p.role === 'production' ? 'working' : p.role === 'office' ? 'atDesk' : p.role === 'guard' ? 'post' : 'idle';
  p.face = p.gateSide ? GUARD_FACE[p.gateSide] : Math.PI;
}

/** Only leave for home when not in the middle of a task. */
function canClockOff(p: Worker) {
  return p.state === 'idle' || p.state === 'working' || p.state === 'atDesk' || p.state === 'post';
}

/** Drivers set off earlier: the drive across town plus the walk from the car park. */
const leadOf = (p: Worker) => (p.carId !== null ? 1.6 : COMMUTE_LEAD_H);
const atWork = (p: Worker, h: number) => onShift(p.shift, h) || onShift(p.shift, (h + leadOf(p)) % 24);

/**
 * home → (drive to the staff car park) → walk in → on duty → walk out → (drive home) → home.
 * People without a car appear at the car park and walk, as before.
 */
function updateDuty(w: World, p: Worker, h: number) {
  switch (p.duty) {
    case 'home':
      if (!atWork(p, h)) return;
      p.duty = 'commuting';
      p.breakTaken = false;
      if (driveToWork(w, p)) {
        p.state = 'drivingIn';
        p.visible = false;
        return;
      }
      p.visible = true;
      p.x = WALK_NODES[lotOf(p)].x + rand(-6, 6);
      p.z = WALK_NODES[lotOf(p)].z + rand(-6, 6);
      p.route = commuteRoute(p);
      p.state = 'commuting';
      return;
    case 'commuting':
      if (p.state === 'drivingIn') {
        if (!parkedAt(w, p, 'staffLot')) return;
        // Out of the car and walk in from the parking bay.
        const spot = carSpot(w, p)!;
        p.x = spot.x;
        p.z = spot.z;
        p.visible = true;
        p.route = [WALK_NODES[lotOf(p)], ...commuteRoute(p)];
        p.state = 'commuting';
        return;
      }
      if (!p.route.length) arriveAtPost(p);
      return;
    case 'onDuty': {
      if (atWork(p, h) || !canClockOff(p)) return;
      p.duty = 'leaving';
      p.visible = true;
      if (p.role === 'office') {
        p.x = WALK_NODES.office.x;
        p.z = WALK_NODES.office.z;
      }
      const spot = parkedAt(w, p, 'staffLot') ? carSpot(w, p) : null;
      p.route = spot ? [...homeRoute(p), { x: spot.x, z: spot.z }] : homeRoute(p);
      p.state = 'leaving';
      return;
    }
    case 'leaving':
      if (p.route.length) return;
      if (p.state === 'leaving' && driveHome(w, p)) {
        p.state = 'drivingHome';
        p.visible = false;
        return;
      }
      if (p.state === 'drivingHome' && !parkedAt(w, p, 'home')) return;
      p.duty = 'home';
      p.visible = false;
      p.state = 'home';
  }
}

/** Meal break at the canteen (office staff and production operators). */
function updateBreak(p: Worker, h: number, dt: number) {
  if (p.breakAt === null || p.duty !== 'onDuty') return;
  const due = p.breakAt % 24;
  const inWindow = h >= due && h < due + 0.25;
  if ((p.state === 'working' || p.state === 'atDesk') && !p.breakTaken && inWindow) {
    p.breakTaken = true;
    p.visible = true;
    if (p.role === 'office') {
      p.x = WALK_NODES.office.x;
      p.z = WALK_NODES.office.z;
    }
    p.route = breakRoute(p);
    p.state = 'toBreak';
  } else if (p.state === 'toBreak' && !p.route.length) {
    p.state = 'onBreak';
    p.visible = false;
    p.timer = BREAK_LENGTH;
  } else if (p.state === 'onBreak') {
    p.timer -= dt;
    if (p.timer > 0) return;
    p.visible = true;
    p.route = backFromBreak(p);
    p.state = 'fromBreak';
  } else if (p.state === 'fromBreak' && !p.route.length) {
    if (p.role === 'office') {
      p.state = 'atDesk';
      p.visible = false;
    } else {
      p.state = 'working';
      p.face = Math.PI;
    }
  }
}

// ---- Guard -------------------------------------------------------------

/** One guard checks paperwork for every truck in and out, first come first served. */
function updateGuard(w: World, p: Worker, dt: number) {
  const gate = p.gateSide!;
  const post = GUARD_POSTS[gate];
  const spot = GATE_CHECK[gate];
  const phase = gate === 'entry' ? 'gateIn' : 'gateOut';
  const target = w.trucks.find((t) => t.id === p.truckId);
  switch (p.state) {
    case 'post': {
      const next = w.trucks.filter((t) => t.phase === phase && !t.cleared).sort((a, b) => a.id - b.id)[0];
      if (!next) return;
      p.truckId = next.id;
      p.route = [{ x: spot.x, z: post.z }, spot];
      p.state = 'toTruck';
      return;
    }
    case 'toTruck':
      if (!target) {
        p.state = 'returning';
        p.route = [post];
      } else if (!p.route.length) {
        p.state = 'checking';
        p.timer = GUARD_CHECK_TIME;
        p.carry = 'docs';
        p.face = GUARD_FACE[gate];
      }
      return;
    case 'checking':
      p.timer -= dt;
      if (p.timer > 0 && target) return;
      if (target) {
        target.cleared = true;
        pushEvent(w, 'gate', `รปภ. ประตู${gate === 'entry' ? 'ทางเข้า' : 'ทางออก'} ตรวจเอกสาร ${target.plate} ผ่าน`);
      }
      p.carry = 'none';
      p.truckId = null;
      p.state = 'returning';
      p.route = [{ x: spot.x, z: post.z }, post];
      return;
    case 'returning':
      if (!p.route.length) {
        p.state = 'post';
        p.face = GUARD_FACE[gate];
      }
  }
}

// ---- Movement ----------------------------------------------------------

function move(p: Worker, dt: number) {
  if (p.route.length) {
    const target = p.route[0];
    p.heading = lerpAngle(p.heading, headingTo(p, target), 1 - Math.exp(-10 * dt));
    if (stepToward(p, target, p.speed * dt)) p.route.shift();
    p.moving = true;
    p.face = null;
    p.phase += dt * p.speed * 4.5;
  } else {
    p.moving = false;
    p.phase += dt * 3;
    if (p.face !== null) p.heading = lerpAngle(p.heading, p.face, 1 - Math.exp(-6 * dt));
  }
}

/** Shift changes, breaks and the guard. Dock, QC, production and driver tasks live in their own features. */
export function updateWorkers(w: World, dt: number) {
  const h = hourOfDay(w.time);
  const shift = currentShift(h);
  if (shift !== w.shift) {
    w.shift = shift;
    pushEvent(w, 'staff', shift === 'day' ? 'เปลี่ยนกะ: กะเช้าเข้างาน กะดึกเลิกงาน' : 'เปลี่ยนกะ: กะดึกเข้างาน กะเช้าเลิกงาน');
  }
  for (const p of w.workers) {
    if (p.role !== 'driver') updateDuty(w, p, h);
    if (p.duty === 'onDuty') {
      updateBreak(p, h, dt);
      if (p.role === 'guard') updateGuard(w, p, dt);
    }
    move(p, dt);
  }
}

/**
 * The person currently covering a post. During a handover both crews are on site:
 * whoever is mid-task finishes it, otherwise the crew whose shift it is takes over.
 */
export function onDutyAt(w: World, match: (p: Worker) => boolean): Worker | undefined {
  const h = hourOfDay(w.time);
  const here = w.workers.filter((p) => p.duty === 'onDuty' && match(p));
  return here.find((p) => !canClockOff(p)) ?? here.find((p) => onShift(p.shift, h)) ?? here[0];
}
