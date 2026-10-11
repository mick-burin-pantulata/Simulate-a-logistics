import { headingTo, lerpAngle, pick, rand, stepToward, type V2 } from '../../core/math';
import type { World } from '../../world/types';
import { STATIONS } from '../production/layout';
import { GATE, GUARD_HOUSE, WALK_DESTS, WALK_NODES, walkRoute } from '../site/layout';
import { DOCKS } from '../warehouse/layout';

export type WorkerRole = 'dock' | 'walker' | 'production' | 'guard';

export interface Worker {
  id: number;
  name: string;
  role: WorkerRole;
  x: number;
  z: number;
  heading: number;
  /** Waypoints still to walk to. */
  route: V2[];
  speed: number;
  moving: boolean;
  carrying: boolean;
  state: string;
  timer: number;
  /** Heading to turn to while standing still. */
  face: number | null;
  /** Animation clock (walk cycle / working motion). */
  phase: number;
  vest: string;
  dockId: number | null;
  /** Role-specific index: staging slot for dock workers, station for operators. */
  job: number;
  /** Current walkway node for pedestrians. */
  node: string | null;
}

const NAMES = [
  'สมชาย', 'สมหญิง', 'วิชัย', 'มานี', 'ประเสริฐ', 'สุดา', 'อนันต์', 'กมล', 'ปรีชา', 'วันดี', 'สมศักดิ์',
  'นภา', 'ธีระ', 'จันทร์เพ็ญ', 'บุญมี', 'ศิริพร', 'อำนาจ', 'พรทิพย์', 'ชาตรี', 'ลำดวน', 'ยุทธนา', 'ดวงใจ',
];

const GUARD_POST: V2 = { x: GUARD_HOUSE.x - GUARD_HOUSE.w / 2 - 1, z: GUARD_HOUSE.z };
/** Island between the in and out lanes, beside a truck waiting at the barrier. */
const GUARD_CHECK: V2 = { x: (GATE.inX + GATE.outX) / 2, z: GATE.z + 2.5 };

export function createWorkers(): Worker[] {
  const workers: Worker[] = [];
  let id = 0;
  const make = (role: WorkerRole, pos: V2, vest: string, extra: Partial<Worker> = {}): Worker => {
    const worker: Worker = {
      id: id++,
      name: NAMES[id % NAMES.length],
      role,
      x: pos.x,
      z: pos.z,
      heading: 0,
      route: [],
      speed: 1.4,
      moving: false,
      carrying: false,
      state: 'idle',
      timer: 0,
      face: null,
      phase: Math.random() * 10,
      vest,
      dockId: null,
      job: 0,
      node: null,
      ...extra,
    };
    workers.push(worker);
    return worker;
  };

  for (const d of DOCKS) make('dock', d.workerHome, '#f97316', { dockId: d.id, speed: 1.7, face: Math.PI });

  STATIONS.forEach((s, i) =>
    make('production', s, '#38bdf8', { job: i, state: 'working', timer: rand(10, 40), face: Math.PI }),
  );

  for (let i = 0; i < 8; i++) {
    const node = pick(WALK_DESTS);
    make('walker', WALK_NODES[node], pick(['#e2e8f0', '#a3e635', '#fde047']), {
      node,
      state: 'pause',
      timer: rand(0, 6),
      speed: rand(1.1, 1.5),
    });
  }

  make('guard', GUARD_POST, '#1e3a8a', { state: 'post', face: Math.PI / 2 });
  return workers;
}

function updateWalker(w: Worker, dt: number) {
  if (w.route.length) return;
  if (w.state === 'walking') {
    w.state = 'pause';
    w.timer = rand(3, 9);
    return;
  }
  w.timer -= dt;
  if (w.timer > 0) return;
  const dest = pick(WALK_DESTS.filter((d) => d !== w.node));
  w.route = walkRoute(w.node ?? dest, dest);
  w.node = dest;
  w.state = 'walking';
}

function updateOperator(world: World, w: Worker, dt: number) {
  if (w.state === 'moving') {
    if (!w.route.length) {
      w.state = 'working';
      w.timer = rand(20, 45);
      w.face = Math.PI;
    }
    return;
  }
  w.timer -= dt;
  if (w.timer > 0) return;
  // Swap to a free station on the same line.
  const line = STATIONS[w.job].line;
  const taken = new Set(world.workers.filter((o) => o.role === 'production').map((o) => o.job));
  const options = STATIONS.map((s, i) => ({ s, i })).filter(({ s, i }) => s.line === line && !taken.has(i));
  if (!options.length) {
    w.timer = rand(10, 20);
    return;
  }
  const next = pick(options);
  w.job = next.i;
  w.route = [{ x: next.s.x, z: next.s.z }];
  w.state = 'moving';
}

function updateGuard(world: World, w: Worker) {
  const truckAtGate = world.trucks.some((t) => t.phase === 'gateIn');
  if (truckAtGate && (w.state === 'post' || w.state === 'returning')) {
    w.route = [{ x: GUARD_CHECK.x, z: GUARD_POST.z + 2 }, GUARD_CHECK];
    w.state = 'toCheck';
  } else if (w.state === 'toCheck' && !w.route.length) {
    w.state = 'checking';
    w.face = -Math.PI / 2;
  } else if (!truckAtGate && (w.state === 'checking' || w.state === 'toCheck')) {
    w.route = [{ x: GUARD_CHECK.x, z: GUARD_POST.z + 2 }, GUARD_POST];
    w.state = 'returning';
  } else if (w.state === 'returning' && !w.route.length) {
    w.state = 'post';
    w.face = Math.PI / 2;
  }
}

function move(w: Worker, dt: number) {
  if (w.route.length) {
    const target = w.route[0];
    const desired = headingTo(w, target);
    w.heading = lerpAngle(w.heading, desired, 1 - Math.exp(-10 * dt));
    if (stepToward(w, target, w.speed * dt)) w.route.shift();
    w.moving = true;
    w.phase += dt * w.speed * 4.5;
  } else {
    w.moving = false;
    w.phase += dt * 3;
    if (w.face !== null) w.heading = lerpAngle(w.heading, w.face, 1 - Math.exp(-6 * dt));
  }
}

/** Behaviour for non-dock roles (dock workers are driven by dock operations), then movement for all. */
export function updateWorkers(world: World, dt: number) {
  for (const w of world.workers) {
    if (w.role === 'walker') updateWalker(w, dt);
    else if (w.role === 'production') updateOperator(world, w, dt);
    else if (w.role === 'guard') updateGuard(world, w);
    if (w.route.length) w.face = null;
    move(w, dt);
  }
}
