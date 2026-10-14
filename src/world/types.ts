import type { Agv, Task } from '../features/agv/agv';
import type { ConveyorState, RawConveyorState } from '../features/conveyor/conveyor';
import type { DockState } from '../features/docks/docks';
import type { Shipment } from '../features/orders/orders';
import type { LineState } from '../features/production/production';
import type { StoreState } from '../features/stores/stores';
import type { SupplierState } from '../features/suppliers/suppliers';
import type { Car } from '../features/traffic/cars';
import type { Signal } from '../features/traffic/signals';
import type { Truck } from '../features/trucks/trucks';
import type { Inventory } from '../features/warehouse/inventory';
import type { Worker } from '../features/workers/workers';

export interface Settings {
  /** Multiplier on residents' shopping (and so on store orders). */
  demand: number;
  /** Stores reorder when stock falls to this fraction of shelf capacity. */
  storeReorder: number;
  /** Factory buys raw material when its raw position falls below this many pallets. */
  rawReorder: number;
  /** Green time per direction at traffic signals (sim seconds). */
  signalGreen: number;
  showPaths: boolean;
  showLabels: boolean;
  /** Floating plate/status pills over trucks. */
  showTags: boolean;
}

export type EventKind = 'truck' | 'gate' | 'dock' | 'agv' | 'order' | 'staff' | 'info';

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
  produced: number;
  raw: number;
  finished: number;
  storeStock: number;
}

export interface Stats {
  received: number;
  shipped: number;
  produced: number;
  trucksServed: number;
  /** Gate-in to gate-out, sim seconds. */
  turnarounds: number[];
  /** Gate-in to dock assignment, sim seconds. */
  queueWaits: number[];
}

export interface World {
  time: number;
  settings: Settings;

  // town
  signals: Signal[];
  cars: Car[];
  nextCarId: number;
  /** Facility id → car id in each parking spot. */
  parking: Record<string, (number | null)[]>;
  stores: StoreState[];
  suppliers: SupplierState[];

  // paperwork
  shipments: Shipment[];
  nextShipmentId: number;

  // warehouse + AGVs
  inventory: Inventory;
  agvs: Agv[];
  tasks: Task[];
  nextTaskId: number;
  /** Grid cell key -> AGV id holding it. */
  reservations: Map<string, number>;

  // production + conveyors
  lines: LineState[];
  conveyor: ConveyorState;
  rawConveyor: RawConveyorState;

  // docks, yard, gate
  docks: DockState[];
  trucks: Truck[];
  nextTruckId: number;
  /** Truck id parked in each west holding bay (queue for a dock). */
  bays: (number | null)[];
  /** Truck id in each east check-out bay (weigh + seal before leaving). */
  checkoutBays: (number | null)[];
  /** Barrier arms: entry gate (west) and exit gate (east), 0 closed .. 1 open. */
  gate: { inOpen: number; outOpen: number };

  // people
  /** Crew currently on shift (used to announce shift changes). */
  shift: 'day' | 'night';
  workers: Worker[];
  nextWorkerId: number;

  stats: Stats;
  events: LogEvent[];
  nextEventId: number;
  history: HistoryPoint[];
  historyTimer: number;
}
