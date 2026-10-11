import { agvRoute, locLabel, type AgvState } from '../features/agv/agv';
import { AGV_STATE } from '../features/agv/labels';
import { TRUCK_KIND, TRUCK_PHASE } from '../features/trucks/labels';
import { truckRoute, type TruckPhase } from '../features/trucks/trucks';
import { TOTAL_SLOTS, countFull } from '../features/warehouse/inventory';
import { DOCKS, type DockKind } from '../features/warehouse/layout';
import { ROLE, activityOf } from '../features/workers/labels';
import type { WorkerRole } from '../features/workers/workers';
import type { HistoryPoint, LogEvent, World } from './types';

export type EntityKind = 'agv' | 'truck' | 'worker';

export interface Selection {
  kind: EntityKind;
  id: number;
}

export interface Badge {
  label: string;
  color: string;
}

/** Generic, display-ready description of the selected entity. */
export interface Inspect {
  kind: EntityKind;
  id: number;
  title: string;
  subtitle: string;
  status: Badge;
  fields: [string, string][];
  progress: { label: string; value: number; max: number } | null;
  path: [number, number][];
}

export interface TruckRow {
  id: number;
  plate: string;
  company: string;
  brand: string;
  color: string;
  kind: DockKind;
  phase: TruckPhase;
  dockName: string;
  cargo: number;
  capacity: number;
  waiting: boolean;
}

export interface AgvRow {
  id: number;
  name: string;
  state: AgvState;
  task: string | null;
  util: number;
  moved: number;
}

export interface DockRow {
  id: number;
  name: string;
  kind: DockKind;
  truck: string | null;
  staged: number;
  slots: number;
  door: number;
  worker: string;
}

export interface WorkerRow {
  id: number;
  name: string;
  role: WorkerRole;
  activity: string;
}

export interface Kpi {
  received: number;
  shipped: number;
  trucksServed: number;
  trucksOnSite: number;
  avgTurnaround: number;
  agvUtil: number;
  occupancy: number;
  stock: number;
  capacity: number;
  pendingTasks: number;
  activeTasks: number;
}

export interface Snapshot {
  time: number;
  kpi: Kpi;
  trucks: TruckRow[];
  agvs: AgvRow[];
  docks: DockRow[];
  workers: WorkerRow[];
  events: LogEvent[];
  history: HistoryPoint[];
  selected: Inspect | null;
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} กม.` : `${m.toFixed(0)} ม.`);

function inspect(w: World, sel: Selection | null): Inspect | null {
  if (!sel) return null;

  if (sel.kind === 'agv') {
    const v = w.agvs.find((x) => x.id === sel.id);
    if (!v) return null;
    const task = w.tasks.find((t) => t.id === v.taskId);
    return {
      kind: 'agv',
      id: v.id,
      title: v.name,
      subtitle: 'รถยกอัตโนมัติ (AGV)',
      status: AGV_STATE[v.state],
      fields: [
        ['งาน', task ? (task.kind === 'pick' ? 'หยิบเพื่อส่งออก' : 'จัดเก็บเข้าชั้น') : '—'],
        ['รับจาก', task ? locLabel(task.src) : '—'],
        ['ส่งที่', task?.dst ? locLabel(task.dst) : '—'],
        ['สถานะ', v.waitTime > 0.3 ? 'รอทาง' : v.carrying ? 'บรรทุกพาเลท' : 'ไม่มีสินค้า'],
        ['ระยะทางสะสม', fmtDist(v.distance)],
        ['ย้ายพาเลทแล้ว', `${v.moved}`],
      ],
      progress: { label: 'อัตราใช้งาน', value: w.time ? v.busyTime / w.time : 0, max: 1 },
      path: agvRoute(v),
    };
  }

  if (sel.kind === 'truck') {
    const t = w.trucks.find((x) => x.id === sel.id);
    if (!t) return null;
    return {
      kind: 'truck',
      id: t.id,
      title: t.plate,
      subtitle: `${t.company} · ${TRUCK_KIND[t.kind]}`,
      status: TRUCK_PHASE[t.phase],
      fields: [
        ['ท่าเทียบ', DOCKS[t.dockId].name],
        ['ความเร็ว', `${(t.speed * 3.6).toFixed(0)} กม./ชม.`],
        ['ทิศทาง', t.dir === 1 ? 'เดินหน้า' : 'ถอยหลัง'],
        ['เวลาในโรงงาน', t.gateInAt === null ? '—' : `${((w.time - t.gateInAt) / 60).toFixed(1)} นาที`],
      ],
      progress: {
        label: t.kind === 'receiving' ? 'สินค้าคงเหลือบนรถ' : 'โหลดแล้ว',
        value: t.cargo,
        max: t.capacity,
      },
      path: truckRoute(t),
    };
  }

  const p = w.workers.find((x) => x.id === sel.id);
  if (!p) return null;
  const fields: [string, string][] = [
    ['ตำแหน่ง', ROLE[p.role].label],
    ['กิจกรรม', activityOf(p)],
  ];
  if (p.dockId !== null) fields.push(['ประจำท่า', DOCKS[p.dockId].name]);
  if (p.carrying) fields.push(['ถือของ', 'พาเลทสินค้า']);
  return {
    kind: 'worker',
    id: p.id,
    title: `คุณ${p.name}`,
    subtitle: ROLE[p.role].label,
    status: { label: p.moving ? 'กำลังเดิน' : 'อยู่กับที่', color: ROLE[p.role].color },
    fields,
    progress: null,
    path: p.route.length ? [[p.x, p.z], ...p.route.map((q): [number, number] => [q.x, q.z])] : [],
  };
}

export function makeSnapshot(w: World, sel: Selection | null): Snapshot {
  const stock = countFull(w.inventory);
  const busy = w.agvs.reduce((sum, v) => sum + v.busyTime, 0);
  const turn = w.stats.turnarounds;

  return {
    time: w.time,
    kpi: {
      received: w.stats.received,
      shipped: w.stats.shipped,
      trucksServed: w.stats.trucksServed,
      trucksOnSite: w.trucks.filter((t) => t.phase !== 'arriving' && t.phase !== 'leaving').length,
      avgTurnaround: turn.length ? turn.reduce((a, b) => a + b, 0) / turn.length : 0,
      agvUtil: w.time && w.agvs.length ? busy / (w.time * w.agvs.length) : 0,
      occupancy: stock / TOTAL_SLOTS,
      stock,
      capacity: TOTAL_SLOTS,
      pendingTasks: w.tasks.filter((t) => t.status === 'pending').length,
      activeTasks: w.tasks.filter((t) => t.status === 'active').length,
    },
    trucks: w.trucks.map((t) => ({
      id: t.id,
      plate: t.plate,
      company: t.company,
      brand: t.brand,
      color: t.color,
      kind: t.kind,
      phase: t.phase,
      dockName: DOCKS[t.dockId].name,
      cargo: t.cargo,
      capacity: t.capacity,
      waiting: t.blockedFor > 0.5,
    })),
    agvs: w.agvs.map((v) => {
      const task = w.tasks.find((t) => t.id === v.taskId);
      return {
        id: v.id,
        name: v.name,
        state: v.state,
        task: task ? (task.kind === 'pick' ? 'หยิบส่งออก' : 'จัดเก็บ') : null,
        util: w.time ? v.busyTime / w.time : 0,
        moved: v.moved,
      };
    }),
    docks: w.docks.map((d) => {
      const def = DOCKS[d.id];
      const truck = w.trucks.find((t) => t.id === d.truckId);
      const worker = w.workers.find((p) => p.role === 'dock' && p.dockId === d.id);
      return {
        id: d.id,
        name: def.name,
        kind: def.kind,
        truck: truck ? truck.plate : null,
        staged: d.stage.filter((s) => s.full).length,
        slots: d.stage.length,
        door: d.door,
        worker: worker ? activityOf(worker) : '—',
      };
    }),
    workers: w.workers.map((p) => ({ id: p.id, name: p.name, role: p.role, activity: activityOf(p) })),
    events: w.events.slice(0, 40),
    history: [...w.history],
    selected: inspect(w, sel),
  };
}

/** Current world position of an entity, for camera focus. */
export function entityPosition(w: World, sel: Selection): { x: number; z: number } | null {
  if (sel.kind === 'agv') return w.agvs.find((v) => v.id === sel.id) ?? null;
  if (sel.kind === 'truck') return w.trucks.find((t) => t.id === sel.id)?.cab ?? null;
  return w.workers.find((p) => p.id === sel.id) ?? null;
}
