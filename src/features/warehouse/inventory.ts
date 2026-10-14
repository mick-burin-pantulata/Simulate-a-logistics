import { RACKS, SLOTS_PER_RACK } from './layout';

/** What a pallet holds: raw material from suppliers, or finished goods from production. */
export type Item = 'raw' | 'finished';

export interface Slot {
  full: boolean;
  reserved: boolean;
  item: Item;
}

export interface Inventory {
  slots: Slot[][];
  /** Bumped on every visible change so the renderer knows when to refresh. */
  version: number;
}

export interface SlotRef {
  rack: number;
  slot: number;
}

/** Racks start partly stocked with both raw material and finished goods. */
export function createInventory(rawFill: number, finishedFill: number): Inventory {
  return {
    slots: RACKS.map(() =>
      Array.from({ length: SLOTS_PER_RACK }, () => {
        const r = Math.random();
        if (r < rawFill) return { full: true, reserved: false, item: 'raw' as Item };
        if (r < rawFill + finishedFill) return { full: true, reserved: false, item: 'finished' as Item };
        return { full: false, reserved: false, item: 'finished' as Item };
      }),
    ),
    version: 0,
  };
}

export const TOTAL_SLOTS = RACKS.length * SLOTS_PER_RACK;

export function countFull(inv: Inventory, item?: Item) {
  let n = 0;
  for (const rack of inv.slots) for (const s of rack) if (s.full && (!item || s.item === item)) n++;
  return n;
}

/** Full pallets of an item that are not already promised to a task. */
export function countAvailable(inv: Inventory, item: Item) {
  let n = 0;
  for (const rack of inv.slots) for (const s of rack) if (s.full && !s.reserved && s.item === item) n++;
  return n;
}

function reserveWhere(inv: Inventory, match: (s: Slot) => boolean): SlotRef | null {
  const candidates: SlotRef[] = [];
  inv.slots.forEach((rack, r) =>
    rack.forEach((s, i) => {
      if (!s.reserved && match(s)) candidates.push({ rack: r, slot: i });
    }),
  );
  if (!candidates.length) return null;
  const ref = candidates[Math.floor(Math.random() * candidates.length)];
  inv.slots[ref.rack][ref.slot].reserved = true;
  return ref;
}

export const reserveFreeSlot = (inv: Inventory) => reserveWhere(inv, (s) => !s.full);
export const reserveFullSlot = (inv: Inventory, item: Item) => reserveWhere(inv, (s) => s.full && s.item === item);

export function setSlot(inv: Inventory, ref: SlotRef, full: boolean, item: Item = 'finished') {
  const s = inv.slots[ref.rack][ref.slot];
  s.full = full;
  s.reserved = false;
  if (full) s.item = item;
  inv.version++;
}
