import { randInt } from '../../core/math';
import type { World } from '../../world/types';
import { SUPPLIERS } from '../city/layout';
import { LINE_BUFFER } from '../conveyor/conveyor';
import { createShipment } from '../orders/orders';
import { minutes } from '../time/clock';
import { countFull } from '../warehouse/inventory';

/**
 * Supplier plants in the industrial estate make raw material continuously. The factory's
 * purchasing watches its raw-material position and orders a truckload from a supplier
 * whenever it drops below the reorder point. The truck collects at the supplier's bay.
 */
export interface SupplierState {
  id: string;
  stock: number;
  capacity: number;
  /** Pallets produced per game hour. */
  rate: number;
  openOrder: number | null;
  shipped: number;
}

export function createSuppliers(): SupplierState[] {
  return SUPPLIERS.map((f, i) => ({ id: f.id, stock: 20 + i * 4, capacity: 40, rate: 4 + i, openOrder: null, shipped: 0 }));
}

/**
 * Raw material the factory has or is already getting: in racks, on the feed conveyor,
 * beside the lines, being fed by AGVs, and on order but not yet unloaded.
 */
export function rawPosition(w: World) {
  const onOrder = w.shipments
    .filter((s) => s.kind === 'receiving' && s.closedAt === null)
    .reduce((sum, s) => sum + s.pallets - s.handled, 0);
  const staged = w.docks.reduce((n, d) => n + d.stage.filter((s) => s.full && s.shipmentId !== null).length, 0);
  const inFeed = w.tasks.filter((t) => t.kind === 'feed').length + w.rawConveyor.items.length;
  const lineSide = w.lines.reduce((n, l) => n + l.raw, 0);
  return countFull(w.inventory, 'raw') + onOrder + staged + inFeed + lineSide;
}

/** Called when a truck is loaded at the supplier's bay. Returns false if stock is short. */
export function collectFrom(w: World, supplierId: string, pallets: number): boolean {
  const s = w.suppliers.find((x) => x.id === supplierId);
  if (!s || s.stock < pallets) return false;
  s.stock -= pallets;
  s.shipped += pallets;
  return true;
}

export function updateSuppliers(w: World, dt: number) {
  for (const s of w.suppliers) s.stock = Math.min(s.capacity, s.stock + (s.rate * dt) / minutes(60));

  // Purchasing: one order at a time per supplier, best-stocked first.
  if (rawPosition(w) >= w.settings.rawReorder + LINE_BUFFER * w.lines.length) return;
  const free = w.suppliers.filter((s) => s.openOrder === null).sort((a, b) => b.stock - a.stock)[0];
  if (!free) return;
  const f = SUPPLIERS.find((x) => x.id === free.id)!;
  const order = createShipment(w, 'receiving', w.time + minutes(randInt(10, 30)), {
    party: f.name,
    facilityId: f.id,
    pallets: randInt(7, 10),
  });
  free.openOrder = order.id;
}

/** Order delivered to the factory: the supplier can take the next one. */
export function closeSupplierOrder(w: World, shipmentId: number) {
  const s = w.suppliers.find((x) => x.openOrder === shipmentId);
  if (s) s.openOrder = null;
}
