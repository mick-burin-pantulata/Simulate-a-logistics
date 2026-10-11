import { approach, forward } from '../../core/math';
import type { World } from '../../world/types';
import { GATE } from '../site/layout';
import { AXLE_TO_REAR } from './routes';
import type { Truck } from './trucks';

const OPEN_SPEED = 0.8;

const rearZ = (t: Truck) => t.trailer.z - forward(t.trailer.heading).z * AXLE_TO_REAR;

/** Barrier arms: open for a truck being waved in/out and stay up until its trailer has cleared. */
export function updateGate(w: World, dt: number) {
  const inWanted = w.trucks.some(
    (t) => (t.phase === 'gateIn' && t.timer < 1.3) || (t.phase === 'toDock' && rearZ(t) > GATE.z - 2),
  );
  const outWanted = w.trucks.some(
    (t) => t.phase === 'gateOut' || (t.phase === 'leaving' && rearZ(t) < GATE.z + 2),
  );
  w.gate.inOpen = approach(w.gate.inOpen, inWanted ? 1 : 0, OPEN_SPEED * dt);
  w.gate.outOpen = approach(w.gate.outOpen, outWanted ? 1 : 0, OPEN_SPEED * dt);
}
