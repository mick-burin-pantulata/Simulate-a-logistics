import { approach, forward } from '../../core/math';
import type { World } from '../../world/types';
import { ENTRY_GATE, EXIT_GATE } from '../site/layout';
import { AXLE_TO_REAR } from './routes';
import { readyToEnter, type Truck } from './trucks';

const OPEN_SPEED = 0.8;

const rearOf = (t: Truck) => {
  const f = forward(t.trailer.heading);
  return { x: t.trailer.x - f.x * AXLE_TO_REAR, z: t.trailer.z - f.z * AXLE_TO_REAR };
};

/** Entry (west) and exit (east) barrier arms lift only for trucks the guard has cleared, and stay up until the trailer is through. */
export function updateGate(w: World, dt: number) {
  const inWanted = w.trucks.some((t) => {
    if (readyToEnter(w, t)) return true;
    const r = rearOf(t);
    return (t.phase === 'toDock' || t.phase === 'toBay') && r.z > ENTRY_GATE.z - 2 && Math.abs(r.x - ENTRY_GATE.x) < 8;
  });
  const outWanted = w.trucks.some((t) => {
    if (t.phase === 'gateOut' && t.cleared) return true;
    const r = rearOf(t);
    return (t.phase === 'toStore' || t.phase === 'toHighway') && r.z < EXIT_GATE.z + 2 && Math.abs(r.x - EXIT_GATE.x) < 8;
  });
  w.gate.inOpen = approach(w.gate.inOpen, inWanted ? 1 : 0, OPEN_SPEED * dt);
  w.gate.outOpen = approach(w.gate.outOpen, outWanted ? 1 : 0, OPEN_SPEED * dt);
}
