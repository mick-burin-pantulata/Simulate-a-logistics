import { agvRoute, locLabel, type AgvState } from '../features/agv/agv';
import { AGV_STATE } from '../features/agv/labels';
import type { Shipment } from '../features/orders/orders';
import { clockLabel, spanLabel } from '../features/time/clock';
import { TRUCK_KIND, TRUCK_PHASE } from '../features/trucks/labels';
import { HOMES, facilityById } from '../features/city/layout';
import { rawPosition } from '../features/suppliers/suppliers';
import { bayName, checkoutName, dockName, inTown, truckRoute, type TruckPhase } from '../features/trucks/trucks';
import { TOTAL_SLOTS, countFull } from '../features/warehouse/inventory';
import { DOCKS, type DockKind } from '../features/warehouse/layout';
import { DUTY, ROLE, activityOf, shiftLabel } from '../features/workers/labels';
import type { Duty, WorkerRole } from '../features/workers/workers';
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
  dockName: string | null;
  bayName: string | null;
  checkoutName: string | null;
  cargo: number;
  capacity: number;
  ref: string;
  /** Sim seconds since reaching the gate. */
  onSite: number | null;
  waiting: boolean;
}

export interface ShipmentRow {
  id: number;
  kind: DockKind;
  ref: string;
  party: string;
  pallets: number;
  handled: number;
  checked: number;
  eta: string;
  status: Badge;
  plate: string | null;
  closed: boolean;
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
  unchecked: number;
  slots: number;
  door: number;
  worker: string | null;
  activity: string;
}

export interface WorkerRow {
  id: number;
  name: string;
  role: WorkerRole;
  shift: string;
  duty: Duty;
  activity: string;
}

export interface LineRow {
  progress: number;
  ready: boolean;
  crew: number;
  raw: number;
  starved: boolean;
}

export interface StoreRow {
  id: string;
  name: string;
  color: string;
  stock: number;
  capacity: number;
  soldToday: number;
  lostToday: number;
  order: string | null;
}

export interface SupplierRow {
  id: string;
  name: string;
  color: string;
  stock: number;
  capacity: number;
  rate: number;
  order: string | null;
}

export interface TownRow {
  population: number;
  atHome: number;
  commuting: number;
  atWork: number;
  shoppers: number;
  carsDriving: number;
  carsParked: number;
  trucksInTown: number;
}

export interface Kpi {
  received: number;
  shipped: number;
  produced: number;
  trucksServed: number;
  trucksOnSite: number;
  queue: number;
  avgTurnaround: number;
  avgQueueWait: number;
  agvUtil: number;
  occupancy: number;
  stock: number;
  capacity: number;
  pendingTasks: number;
  activeTasks: number;
  onConveyor: number;
  staffOnDuty: number;
  rawStock: number;
  finishedStock: number;
  /** Raw material on hand + in transit, vs the reorder point. */
  rawPosition: number;
  storeStock: number;
  /** Share of shoppers who found what they wanted. */
  serviceLevel: number;
}

export interface Snapshot {
  time: number;
  kpi: Kpi;
  trucks: TruckRow[];
  bays: (string | null)[];
  checkoutBays: (string | null)[];
  shipments: ShipmentRow[];
  agvs: AgvRow[];
  docks: DockRow[];
  lines: LineRow[];
  stores: StoreRow[];
  suppliers: SupplierRow[];
  town: TownRow;
  workers: WorkerRow[];
  events: LogEvent[];
  history: HistoryPoint[];
  selected: Inspect | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} กม.` : `${m.toFixed(0)} ม.`);

/** Where a shipment is in its life, derived from its truck. */
function shipmentStatus(w: World, s: Shipment): Badge {
  const receiving = s.kind === 'receiving';
  if (s.closedAt !== null) {
    if (receiving && s.checked < s.pallets) return { label: 'กำลังตรวจรับ QC', color: '#a3e635' };
    return { label: receiving ? 'รับเข้าคลังแล้ว' : 'ส่งถึงร้านแล้ว', color: '#64748b' };
  }
  const t = w.trucks.find((x) => x.id === s.truckId);
  if (!t) return { label: `รถออก ${clockLabel(s.eta)}`, color: '#94a3b8' };
  switch (t.phase) {
    case 'toSupplier':
      return { label: 'รถไปรับที่ซัพพลายเออร์', color: '#2dd4bf' };
    case 'atSupplier':
      return { label: 'กำลังขึ้นวัตถุดิบ', color: '#2dd4bf' };
    case 'toStore':
      return { label: 'กำลังไปส่งร้าน', color: '#f472b6' };
    case 'atStore':
      return { label: 'กำลังลงของที่ร้าน', color: '#f472b6' };
    case 'arriving':
      return { label: 'รถกำลังมาโรงงาน', color: '#94a3b8' };
    case 'gateIn':
      return { label: 'ถึงประตู', color: '#facc15' };
    case 'toBay':
    case 'waiting':
      return { label: 'รอคิวเข้าท่า', color: '#f97316' };
    case 'toDock':
    case 'reversing':
      return receiving ? { label: 'กำลังเข้าท่า', color: '#38bdf8' } : { label: 'กำลังหยิบสินค้า', color: '#38bdf8' };
    case 'docked':
      return receiving ? { label: 'กำลังขนลง', color: '#4ade80' } : { label: 'กำลังโหลดขึ้นรถ', color: '#4ade80' };
    default:
      return { label: 'ตรวจออก/ออกเดินทาง', color: '#a78bfa' };
  }
}

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
    const s = w.shipments.find((x) => x.id === t.shipmentId);
    const fields: [string, string][] = [
      ['เอกสาร', s ? `${s.ref}` : '—'],
      [t.kind === 'receiving' ? 'ผู้ส่ง' : 'ลูกค้า', s?.party ?? '—'],
      ['ท่าเทียบ', dockName(t) ?? (t.bay !== null ? `รอคิวที่ ${bayName(t.bay)}` : 'ยังไม่ได้ท่า')],
      ['คนขับ', t.driverInCab ? 'อยู่ในรถ' : 'ลงไปยื่นเอกสาร'],
      ['ความเร็ว', `${(t.speed * 3.6).toFixed(0)} กม./ชม.`],
      ['อยู่ในโรงงาน', t.gateInAt === null ? '—' : spanLabel(w.time - t.gateInAt)],
    ];
    return {
      kind: 'truck',
      id: t.id,
      title: t.plate,
      subtitle: `${t.company} · ${TRUCK_KIND[t.kind]}`,
      status: TRUCK_PHASE[t.phase],
      fields,
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
    ['กะ', shiftLabel(p)],
    ['กิจกรรม', activityOf(p)],
  ];
  if (p.dockId !== null && p.role === 'dock') fields.push(['ประจำท่า', DOCKS[p.dockId].name]);
  if (p.line !== null) fields.push(['ประจำไลน์', `Line ${String.fromCharCode(65 + p.line)}`]);
  if (p.role === 'driver') {
    const t = w.trucks.find((x) => x.id === p.truckId);
    if (t) fields.push(['ขับรถ', t.plate]);
  }
  if (p.carry === 'pallet') fields.push(['ถือ', 'แฮนด์ลิฟต์ + พาเลท']);
  if (p.carry === 'docs') fields.push(['ถือ', 'เอกสาร']);
  return {
    kind: 'worker',
    id: p.id,
    title: p.role === 'driver' ? p.name : `คุณ${p.name}`,
    subtitle: ROLE[p.role].label,
    status: DUTY[p.duty],
    fields,
    progress: null,
    path: p.route.length ? [[p.x, p.z], ...p.route.map((q): [number, number] => [q.x, q.z])] : [],
  };
}

export function makeSnapshot(w: World, sel: Selection | null): Snapshot {
  const stock = countFull(w.inventory);
  const busy = w.agvs.reduce((sum, v) => sum + v.busyTime, 0);

  return {
    time: w.time,
    kpi: {
      received: w.stats.received,
      shipped: w.stats.shipped,
      produced: w.stats.produced,
      trucksServed: w.stats.trucksServed,
      trucksOnSite: w.trucks.filter((t) => t.phase !== 'arriving' && !inTown(t)).length,
      queue: w.trucks.filter((t) => t.dockId === null && t.phase !== 'arriving').length,
      avgTurnaround: avg(w.stats.turnarounds),
      avgQueueWait: avg(w.stats.queueWaits),
      agvUtil: w.time && w.agvs.length ? busy / (w.time * w.agvs.length) : 0,
      occupancy: stock / TOTAL_SLOTS,
      stock,
      capacity: TOTAL_SLOTS,
      pendingTasks: w.tasks.filter((t) => t.status === 'pending').length,
      activeTasks: w.tasks.filter((t) => t.status === 'active').length,
      onConveyor: w.conveyor.items.length,
      staffOnDuty: w.workers.filter((p) => p.role !== 'driver' && p.duty === 'onDuty').length,
      rawStock: countFull(w.inventory, 'raw'),
      finishedStock: countFull(w.inventory, 'finished'),
      rawPosition: rawPosition(w),
      storeStock: w.stores.reduce((n, s) => n + s.stock, 0),
      serviceLevel: (() => {
        const sold = w.stores.reduce((n, s) => n + s.sold, 0);
        const lost = w.stores.reduce((n, s) => n + s.lost, 0);
        return sold + lost > 0 ? sold / (sold + lost) : 1;
      })(),
    },
    trucks: w.trucks.map((t) => ({
      id: t.id,
      plate: t.plate,
      company: t.company,
      brand: t.brand,
      color: t.color,
      kind: t.kind,
      phase: t.phase,
      dockName: dockName(t),
      bayName: t.bay === null ? null : bayName(t.bay),
      checkoutName: t.checkoutBay === null ? null : checkoutName(t.checkoutBay),
      cargo: t.cargo,
      capacity: t.capacity,
      ref: w.shipments.find((s) => s.id === t.shipmentId)?.ref ?? '—',
      onSite: t.gateInAt === null ? null : w.time - t.gateInAt,
      waiting: t.blockedFor > 0.5,
    })),
    bays: w.bays.map((id) => (id === null ? null : (w.trucks.find((t) => t.id === id)?.plate ?? null))),
    checkoutBays: w.checkoutBays.map((id) => (id === null ? null : (w.trucks.find((t) => t.id === id)?.plate ?? null))),
    shipments: [...w.shipments]
      .sort((a, b) => Number(a.closedAt !== null) - Number(b.closedAt !== null) || a.eta - b.eta)
      .map((s) => ({
        id: s.id,
        kind: s.kind,
        ref: s.ref,
        party: s.party,
        pallets: s.pallets,
        handled: s.handled,
        checked: s.checked,
        eta: clockLabel(s.eta),
        status: shipmentStatus(w, s),
        plate: w.trucks.find((t) => t.id === s.truckId)?.plate ?? null,
        closed: s.closedAt !== null,
      })),
    agvs: w.agvs.map((v) => {
      const task = w.tasks.find((t) => t.id === v.taskId);
      return {
        id: v.id,
        name: v.name,
        state: v.state,
        task: task ? (task.kind === 'pick' ? 'หยิบส่งออก' : task.src.kind === 'conveyor' ? 'รับจากสายพาน' : 'จัดเก็บ') : null,
        util: w.time ? v.busyTime / w.time : 0,
        moved: v.moved,
      };
    }),
    docks: w.docks.map((d) => {
      const def = DOCKS[d.id];
      const truck = w.trucks.find((t) => t.id === d.truckId);
      const worker = w.workers.find(
        (p) => p.role === 'dock' && p.dockId === d.id && p.duty === 'onDuty' && p.state !== 'idle',
      ) ?? w.workers.find((p) => p.role === 'dock' && p.dockId === d.id && p.duty === 'onDuty');
      return {
        id: d.id,
        name: def.name,
        kind: def.kind,
        truck: truck ? truck.plate : null,
        staged: d.stage.filter((s) => s.full).length,
        unchecked: d.stage.filter((s) => s.full && !s.checked).length,
        slots: d.stage.length,
        door: d.door,
        worker: worker ? `คุณ${worker.name}` : null,
        activity: worker ? activityOf(worker) : 'ไม่มีพนักงาน (เปลี่ยนกะ)',
      };
    }),
    lines: w.lines.map((l, i) => ({
      progress: l.progress,
      ready: l.ready,
      crew: w.workers.filter((p) => p.role === 'production' && p.line === i && p.duty === 'onDuty' && p.state === 'working').length,
      raw: l.raw,
      starved: l.starved,
    })),
    stores: w.stores.map((s) => {
      const f = facilityById.get(s.id)!;
      const order = w.shipments.find((x) => x.id === s.openOrder);
      return {
        id: s.id,
        name: f.name,
        color: f.color,
        stock: s.stock,
        capacity: s.capacity,
        soldToday: s.soldToday,
        lostToday: s.lostToday,
        order: order ? `${order.ref} · ${shipmentStatus(w, order).label}` : null,
      };
    }),
    suppliers: w.suppliers.map((s) => {
      const f = facilityById.get(s.id)!;
      const order = w.shipments.find((x) => x.id === s.openOrder);
      return {
        id: s.id,
        name: f.name,
        color: f.color,
        stock: s.stock,
        capacity: s.capacity,
        rate: s.rate,
        order: order ? `${order.ref} · ${shipmentStatus(w, order).label}` : null,
      };
    }),
    town: {
      population: w.workers.filter((p) => p.homeId !== null).length + HOMES.length * 2,
      atHome: w.workers.filter((p) => p.duty === 'home').length,
      commuting: w.workers.filter((p) => p.duty === 'commuting' || p.duty === 'leaving').length,
      atWork: w.workers.filter((p) => p.duty === 'onDuty' && p.role !== 'driver').length,
      shoppers: w.cars.filter((c) => c.ownerId === -1).length,
      carsDriving: w.cars.filter((c) => c.state === 'driving').length,
      carsParked: w.cars.filter((c) => c.state === 'parked').length,
      trucksInTown: w.trucks.filter(inTown).length,
    },
    workers: w.workers.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      shift: shiftLabel(p),
      duty: p.duty,
      activity: activityOf(p),
    })),
    events: w.events.slice(0, 40),
    history: [...w.history],
    selected: inspect(w, sel),
  };
}

/** Current world position of an entity, for camera focus. */
export function entityPosition(w: World, sel: Selection): { x: number; z: number } | null {
  if (sel.kind === 'agv') return w.agvs.find((v) => v.id === sel.id) ?? null;
  if (sel.kind === 'truck') return w.trucks.find((t) => t.id === sel.id)?.cab ?? null;
  const p = w.workers.find((x) => x.id === sel.id);
  if (!p) return null;
  // While driving to/from work the person is inside their car.
  if ((p.state === 'drivingIn' || p.state === 'drivingHome') && p.carId !== null) {
    const car = w.cars.find((c) => c.id === p.carId);
    if (car) return car;
  }
  return p;
}
