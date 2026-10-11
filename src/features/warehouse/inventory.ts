import { RACKS, SLOTS_PER_RACK } from './layout';

export interface Slot {
  full: boolean;
  reserved: boolean;
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

export function createInventory(fill: number): Inventory {
  return {
    slots: RACKS.map(() =>
      Array.from({ length: SLOTS_PER_RACK }, () => ({ full: Math.random() < fill, reserved: false })),
    ),
    version: 0,
  };
}

export const TOTAL_SLOTS = RACKS.length * SLOTS_PER_RACK;

export function countFull(inv: Inventory) {
  let n = 0;
  for (const rack of inv.slots) for (const s of rack) if (s.full) n++;
  return n;
}

function reserveWhere(inv: Inventory, wantFull: boolean): SlotRef | null {
  const candidates: SlotRef[] = [];
  inv.slots.forEach((rack, r) =>
    rack.forEach((s, i) => {
      if (s.full === wantFull && !s.reserved) candidates.push({ rack: r, slot: i });
    }),
  );
  if (!candidates.length) return null;
  const ref = candidates[Math.floor(Math.random() * candidates.length)];
  inv.slots[ref.rack][ref.slot].reserved = true;
  return ref;
}

export const reserveFreeSlot = (inv: Inventory) => reserveWhere(inv, false);
export const reserveFullSlot = (inv: Inventory) => reserveWhere(inv, true);

export function setSlot(inv: Inventory, ref: SlotRef, full: boolean) {
  const s = inv.slots[ref.rack][ref.slot];
  s.full = full;
  s.reserved = false;
  inv.version++;
}
