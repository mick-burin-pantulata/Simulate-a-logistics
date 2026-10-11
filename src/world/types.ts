import type { Agv, Task } from '../features/agv/agv';
import type { DockState } from '../features/docks/docks';
import type { Truck } from '../features/trucks/trucks';
import type { Inventory } from '../features/warehouse/inventory';
import type { Worker } from '../features/workers/workers';

export interface Settings {
  /** Average seconds between inbound (receiving) trucks. */
  inboundEvery: number;
  /** Average seconds between outbound (shipping) trucks. */
  outboundEvery: number;
  showPaths: boolean;
  showLabels: boolean;
  /** Floating plate/status pills over trucks. */
  showTags: boolean;
}

export type EventKind = 'truck' | 'gate' | 'dock' | 'agv' | 'info';

export interface LogEvent {
  id: number;
  t: number;
  kind: EventKind;
  text: string;
}

export interface HistoryPoint {
  t: number;
  occupancy: number;
  received: number;
  shipped: number;
}

export interface Stats {
  received: number;
  shipped: number;
  trucksServed: number;
  turnarounds: number[];
}

export interface World {
  time: number;
  settings: Settings;

  // warehouse + AGVs
  inventory: Inventory;
  agvs: Agv[];
  tasks: Task[];
  nextTaskId: number;
  /** Grid cell key -> AGV id holding it. */
  reservations: Map<string, number>;

  // docks + trucks
  docks: DockState[];
  trucks: Truck[];
  nextTruckId: number;
  spawn: { inbound: number; outbound: number };
  gate: { inOpen: number; outOpen: number };

  // people
  workers: Worker[];

  stats: Stats;
  events: LogEvent[];
  nextEventId: number;
  history: HistoryPoint[];
  historyTimer: number;
}
