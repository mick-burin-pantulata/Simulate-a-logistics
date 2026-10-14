import { rand, randInt } from '../../core/math';
import { pushEvent } from '../../world/events';
import type { World } from '../../world/types';
import { STORES } from '../city/layout';
import { createShipment } from '../orders/orders';
import { dayNumber, minutes } from '../time/clock';

/**
 * Shops in town sell the factory's product to residents. Stock is in pallets; every
 * shopping trip takes a basket's worth. When stock (plus anything on order) falls to the
 * reorder point, the shop sends the factory a sales order.
 */
export interface StoreState {
  id: string;
  stock: number;
  capacity: number;
  /** Open sales order (shipment id) — one at a time. */
  openOrder: number | null;
  soldToday: number;
  lostToday: number;
  sold: number;
  lost: number;
  day: number;
}

/** Pallet-equivalents of product one shopping trip buys. */
export const BASKET = 0.5;
const MAX_TRUCK = 12;

const capacityOf = (width: number) => Math.round(width * 0.6);

export function createStores(): StoreState[] {
  return STORES.map((f) => {
    const capacity = capacityOf(f.width);
    return { id: f.id, stock: capacity * rand(0.55, 0.9), capacity, openOrder: null, soldToday: 0, lostToday: 0, sold: 0, lost: 0, day: 1 };
  });
}

export const storeOpen = (h: number) => h >= 8 && h < 22;

/** A shopper reached the till. Returns false if the shelves were empty (lost sale). */
export function buyAt(w: World, storeId: string): boolean {
  const s = w.stores.find((x) => x.id === storeId);
  if (!s) return false;
  if (s.stock >= BASKET) {
    s.stock -= BASKET;
    s.sold += BASKET;
    s.soldToday += BASKET;
    return true;
  }
  s.lost += BASKET;
  s.lostToday += BASKET;
  return false;
}

/** A delivery truck has unloaded at the shop. */
export function deliverToStore(w: World, storeId: string, pallets: number) {
  const s = w.stores.find((x) => x.id === storeId);
  if (!s) return;
  s.stock = Math.min(s.capacity + MAX_TRUCK, s.stock + pallets);
  s.openOrder = null;
}

export function updateStores(w: World) {
  const day = dayNumber(w.time);
  for (const s of w.stores) {
    const f = STORES.find((x) => x.id === s.id)!;
    if (s.day !== day) {
      s.day = day;
      s.soldToday = 0;
      s.lostToday = 0;
    }
    if (s.openOrder !== null) continue;
    if (s.stock > s.capacity * w.settings.storeReorder) continue;
    const pallets = Math.max(5, Math.min(MAX_TRUCK, Math.round(s.capacity - s.stock)));
    const order = createShipment(w, 'shipping', w.time + minutes(randInt(20, 60)), { party: f.name, facilityId: f.id, pallets });
    s.openOrder = order.id;
    pushEvent(w, 'order', `${f.name} สต็อกเหลือ ${s.stock.toFixed(1)} พาเลท ต่ำกว่าจุดสั่งซื้อ`);
  }
}
