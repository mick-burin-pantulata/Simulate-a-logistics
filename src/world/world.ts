import { addAgv, updateAgvs } from '../features/agv/agv';
import { createDocks, updateDocks } from '../features/docks/docks';
import { updateGate } from '../features/trucks/gate';
import { updateTrucks } from '../features/trucks/trucks';
import { TOTAL_SLOTS, countFull, createInventory } from '../features/warehouse/inventory';
import { createWorkers, updateWorkers } from '../features/workers/workers';
import { pushEvent } from './events';
import type { Settings, World } from './types';

const HISTORY_EVERY = 10;
const HISTORY_MAX = 90;

export const DEFAULT_SETTINGS: Settings = {
  inboundEvery: 40,
  outboundEvery: 35,
  showPaths: true,
  showLabels: true,
  showTags: true,
};

export function createWorld(agvCount: number, settings: Settings): World {
  const w: World = {
    time: 0,
    settings,
    inventory: createInventory(0.5),
    agvs: [],
    tasks: [],
    nextTaskId: 1,
    reservations: new Map(),
    docks: createDocks(),
    trucks: [],
    nextTruckId: 1,
    spawn: { inbound: 1, outbound: 8 },
    gate: { inOpen: 0, outOpen: 0 },
    workers: createWorkers(),
    stats: { received: 0, shipped: 0, trucksServed: 0, turnarounds: [] },
    events: [],
    nextEventId: 1,
    history: [],
    historyTimer: 0,
  };
  for (let i = 0; i < agvCount; i++) addAgv(w);
  pushEvent(w, 'info', 'เริ่มกะทำงาน 08:00 น.');
  sampleHistory(w);
  return w;
}

function sampleHistory(w: World) {
  w.history.push({
    t: w.time,
    occupancy: (countFull(w.inventory) / TOTAL_SLOTS) * 100,
    received: w.stats.received,
    shipped: w.stats.shipped,
  });
  if (w.history.length > HISTORY_MAX) w.history.shift();
}

/** Advance every feature by `dt` seconds of sim time. Keep dt small (≤ 0.05). */
export function tickWorld(w: World, dt: number) {
  w.time += dt;
  updateTrucks(w, dt);
  updateGate(w, dt);
  updateDocks(w, dt);
  updateAgvs(w, dt);
  updateWorkers(w, dt);

  w.historyTimer += dt;
  if (w.historyTimer >= HISTORY_EVERY) {
    w.historyTimer = 0;
    sampleHistory(w);
  }
}
