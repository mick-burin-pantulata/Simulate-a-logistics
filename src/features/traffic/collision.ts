import type { V2 } from '../../core/math';
import type { World } from '../../world/types';

/** Car ids live in their own range so trucks and cars can share one "who blocks whom" graph. */
export const CAR_ID_BASE = 1_000_000;

/** Anything on the road that can block or be blocked. */
export interface Agent {
  id: number;
  /** Moving agents look ahead from `lead` along `dir`; parked ones only act as obstacles. */
  moving: boolean;
  lead: V2;
  dir: V2;
  look: number;
  /** Outline sample points. */
  points: V2[];
  /** Direction the body faces / travels (for ignoring oncoming traffic). */
  fwd: V2;
}

export interface Yielding {
  id: number;
  blockers: number[];
  blockedFor: number;
  ghostFor: number;
}

const LATERAL = 2.1;
/** After this long in a circular wait (gridlock), squeeze past. */
const MAX_YIELD = 8;
const GHOST_TIME = 4;

/** For each moving agent, which agents sit in the space just ahead of it. */
export function computeBlockers(agents: Agent[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (const a of agents) {
    if (!a.moving) {
      out.set(a.id, []);
      continue;
    }
    const hits: number[] = [];
    for (const o of agents) {
      if (o === a) continue;
      // Oncoming traffic in the other lane never counts as "ahead of me".
      if (a.dir.x * o.fwd.x + a.dir.z * o.fwd.z < -0.5) continue;
      const hit = o.points.some((q) => {
        const rx = q.x - a.lead.x;
        const rz = q.z - a.lead.z;
        if (Math.abs(rx) > a.look + 6 || Math.abs(rz) > a.look + 6) return false;
        const ahead = rx * a.dir.x + rz * a.dir.z;
        const lateral = Math.abs(rx * a.dir.z - rz * a.dir.x);
        return ahead > -0.5 && ahead < a.look && lateral < LATERAL;
      });
      if (hit) hits.push(o.id);
    }
    out.set(a.id, hits);
  }
  return out;
}

function blockersOf(w: World, id: number): number[] {
  if (id >= CAR_ID_BASE) return w.cars.find((c) => c.id === id)?.blockers ?? [];
  return w.trucks.find((t) => t.id === id)?.blockers ?? [];
}

/** Does following "who blocks whom" from this agent lead back to it? */
function inCycle(w: World, self: Yielding) {
  const seen = new Set<number>();
  const stack = [...self.blockers];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === self.id) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...blockersOf(w, id));
  }
  return false;
}

/**
 * Should this agent hold position this tick? Ordinary queues just wait; mutual blocks are
 * resolved by id priority; a longer circular wait (gridlock) eventually lets it squeeze past.
 */
export function mustYield(w: World, self: Yielding, dt: number): boolean {
  if (self.ghostFor > 0) {
    self.ghostFor -= dt;
    return false;
  }
  const blocked = self.blockers.some((id) => !(blockersOf(w, id).includes(self.id) && self.id < id));
  self.blockedFor = blocked && inCycle(w, self) ? self.blockedFor + dt : 0;
  if (self.blockedFor > MAX_YIELD) {
    self.blockedFor = 0;
    self.ghostFor = GHOST_TIME;
    return false;
  }
  return blocked;
}
