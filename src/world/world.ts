import { addAgv, updateAgvs } from '../features/agv/agv';
import { createConveyor, createRawConveyor, updateConveyor, updateRawConveyor } from '../features/conveyor/conveyor';
import { createDocks, updateDocks } from '../features/docks/docks';
import { updateOrders } from '../features/orders/orders';
import { createLines, updateProduction } from '../features/production/production';
import { setupResidents, updateShopping } from '../features/residential/residents';
import { EAST_BAY_X, WEST_BAY_X } from '../features/site/layout';
import { createStores, updateStores } from '../features/stores/stores';
import { createSuppliers, updateSuppliers } from '../features/suppliers/suppliers';
import { currentShift, hourOfDay } from '../features/time/clock';
import { carAgent, removeGoneCars, updateCars } from '../features/traffic/cars';
import { computeBlockers } from '../features/traffic/collision';
import { createSignals, updateSignals } from '../features/traffic/signals';
import { updateDrivers } from '../features/trucks/drivers';
import { updateGate } from '../features/trucks/gate';
import { truckAgent, updateTrucks } from '../features/trucks/trucks';
import { TOTAL_SLOTS, countFull, createInventory } from '../features/warehouse/inventory';
import { createStaff, updateWorkers } from '../features/workers/workers';
import { pushEvent } from './events';
import type { Settings, World } from './types';

const HISTORY_EVERY = 10;
const HISTORY_MAX = 90;

export const DEFAULT_SETTINGS: Settings = {
  demand: 1,
  storeReorder: 0.4,
  rawReorder: 90,
  signalGreen: 14,
  showPaths: true,
  showLabels: true,
  showTags: true,
};

export function createWorld(agvCount: number, settings: Settings): World {
  const w: World = {
    time: 0,
    settings,
    signals: createSignals(),
    cars: [],
    nextCarId: 1,
    parking: {},
    stores: createStores(),
    suppliers: createSuppliers(),
    shipments: [],
    nextShipmentId: 1,
    inventory: createInventory(0.18, 0.3),
    agvs: [],
    tasks: [],
    nextTaskId: 1,
    reservations: new Map(),
    lines: createLines(),
    conveyor: createConveyor(),
    rawConveyor: createRawConveyor(),
    docks: createDocks(),
    trucks: [],
    nextTruckId: 1,
    bays: WEST_BAY_X.map(() => null),
    checkoutBays: EAST_BAY_X.map(() => null),
    gate: { inOpen: 0, outOpen: 0 },
    shift: currentShift(hourOfDay(0)),
    workers: [],
    nextWorkerId: 1,
    stats: { received: 0, shipped: 0, produced: 0, trucksServed: 0, turnarounds: [], queueWaits: [] },
    events: [],
    nextEventId: 1,
    history: [],
    historyTimer: 0,
  };
  for (let i = 0; i < agvCount; i++) addAgv(w);
  createStaff(w);
  setupResidents(w);
  pushEvent(w, 'info', 'เริ่มบันทึก วันที่ 1 เวลา 05:30 น. — กะดึกยังทำงานอยู่ กะเช้ากำลังออกจากบ้าน');
  sampleHistory(w);
  return w;
}

function sampleHistory(w: World) {
  w.history.push({
    t: w.time,
    occupancy: (countFull(w.inventory) / TOTAL_SLOTS) * 100,
    received: w.stats.received,
    shipped: w.stats.shipped,
    produced: w.stats.produced,
    raw: countFull(w.inventory, 'raw'),
    finished: countFull(w.inventory, 'finished'),
    storeStock: w.stores.reduce((n, s) => n + s.stock, 0),
  });
  if (w.history.length > HISTORY_MAX) w.history.shift();
}

/** Trucks and moving cars share one "who is in my way" graph. */
function updateTrafficBlockers(w: World) {
  const agents = [...w.trucks.map(truckAgent), ...w.cars.filter((c) => c.state === 'driving').map(carAgent)];
  const blockers = computeBlockers(agents);
  for (const t of w.trucks) t.blockers = blockers.get(t.id) ?? [];
  for (const c of w.cars) c.blockers = blockers.get(c.id) ?? [];
}

/** Advance every feature by `dt` seconds of sim time. Keep dt small (≤ 0.05). */
export function tickWorld(w: World, dt: number) {
  w.time += dt;
  // Town: demand and supply decide what trucks are needed.
  updateSuppliers(w, dt);
  updateStores(w);
  updateShopping(w, dt);
  updateOrders(w);
  // Roads.
  updateSignals(w, dt);
  updateTrafficBlockers(w);
  updateTrucks(w, dt);
  updateCars(w, dt);
  removeGoneCars(w);
  // Factory.
  updateGate(w, dt);
  updateDrivers(w, dt);
  updateDocks(w, dt);
  updateProduction(w, dt);
  updateConveyor(w, dt);
  updateRawConveyor(w, dt);
  updateAgvs(w, dt);
  updateWorkers(w, dt);

  w.historyTimer += dt;
  if (w.historyTimer >= HISTORY_EVERY) {
    w.historyTimer = 0;
    sampleHistory(w);
  }
}
