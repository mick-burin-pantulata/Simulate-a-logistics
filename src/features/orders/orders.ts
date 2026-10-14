import { pushEvent } from '../../world/events';
import type { World } from '../../world/types';
import { clockLabel } from '../time/clock';
import type { DockKind } from '../warehouse/layout';

/**
 * A shipment is the paperwork behind one truck trip:
 * - receiving: an ASN — the factory bought raw material from a supplier in town
 * - shipping: a sales order — a store in town ordered finished goods
 */
export interface Shipment {
  id: number;
  kind: DockKind;
  ref: string;
  /** Supplier (receiving) or store (shipping) name. */
  party: string;
  /** Supplier or store facility the truck visits. */
  facilityId: string;
  pallets: number;
  /** Pallets unloaded at the factory (receiving) or loaded there (shipping). */
  handled: number;
  /** Receiving only: pallets that passed QC. */
  checked: number;
  createdAt: number;
  /** When the truck sets off from the highway depot. */
  eta: number;
  truckId: number | null;
  /** Receiving: truck left the factory. Shipping: delivered to the store. */
  closedAt: number | null;
}

export function createShipment(
  w: World,
  kind: DockKind,
  eta: number,
  opts: { party: string; facilityId: string; pallets: number },
) {
  const n = w.nextShipmentId++;
  const s: Shipment = {
    id: n,
    kind,
    ref: kind === 'receiving' ? `PO-${4100 + n}` : `SO-${7200 + n}`,
    party: opts.party,
    facilityId: opts.facilityId,
    pallets: opts.pallets,
    handled: 0,
    checked: 0,
    createdAt: w.time,
    eta,
    truckId: null,
    closedAt: null,
  };
  w.shipments.push(s);
  pushEvent(
    w,
    'order',
    kind === 'receiving'
      ? `โรงงานสั่งวัตถุดิบ ${s.ref} จาก ${s.party} ${s.pallets} พาเลท รถออก ${clockLabel(eta)}`
      : `${s.party} สั่งสินค้า ${s.ref} ${s.pallets} พาเลท รถออก ${clockLabel(eta)}`,
  );
  return s;
}

/** Keep a bounded history of closed paperwork. */
export function updateOrders(w: World) {
  const closed = w.shipments.filter((s) => s.closedAt !== null);
  if (closed.length > 30) {
    const drop = new Set(closed.slice(0, closed.length - 30));
    w.shipments = w.shipments.filter((s) => !drop.has(s));
  }
}

export const shipmentOf = (w: World, id: number | null) => (id === null ? undefined : w.shipments.find((s) => s.id === id));
