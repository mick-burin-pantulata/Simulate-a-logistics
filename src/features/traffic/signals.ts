import type { V2 } from '../../core/math';
import type { Path } from '../../core/path';
import type { World } from '../../world/types';
import { ROAD_NODES } from '../roads/network';

/** Which pair of approaches has right of way at a signalised junction. */
export type Axis = 'NS' | 'EW';
export type Light = 'green' | 'yellow' | 'red';

export interface Signal {
  node: string;
  green: Axis;
  stage: 'green' | 'yellow' | 'allRed';
  t: number;
}

const YELLOW = 3;
/** Clearance time for vehicles committed on amber. */
const ALL_RED = 2.5;

export const axisOf = (d: V2): Axis => (Math.abs(d.x) > Math.abs(d.z) ? 'EW' : 'NS');

export function createSignals(): Signal[] {
  return Object.values(ROAD_NODES)
    .filter((n) => n.signal)
    .map((n, i) => ({ node: n.id, green: i % 2 ? 'NS' : 'EW', stage: 'green', t: (i * 5) % 12 }));
}

/** Green → yellow → all-red → other axis green, on sim seconds. */
export function updateSignals(w: World, dt: number) {
  const green = w.settings.signalGreen;
  for (const s of w.signals) {
    s.t += dt;
    if (s.stage === 'green' && s.t >= green) {
      s.stage = 'yellow';
      s.t = 0;
    } else if (s.stage === 'yellow' && s.t >= YELLOW) {
      s.stage = 'allRed';
      s.t = 0;
    } else if (s.stage === 'allRed' && s.t >= ALL_RED) {
      s.stage = 'green';
      s.green = s.green === 'NS' ? 'EW' : 'NS';
      s.t = 0;
    }
  }
}

export function lightFor(s: Signal, axis: Axis): Light {
  if (s.stage === 'allRed' || s.green !== axis) return 'red';
  return s.stage === 'yellow' ? 'yellow' : 'green';
}

/** A place on a vehicle's path where it must obey a signal. */
export interface StopLine {
  s: number;
  node: string;
  axis: Axis;
}

/** Stop line distance before the junction centre (clear of the crossing road). */
const STOP_BACK = 9;

/** Stop lines for every signalised junction a route passes through. */
export function stopLinesFor(path: Path, junctions: string[]): StopLine[] {
  const out: StopLine[] = [];
  for (const id of junctions) {
    const node = ROAD_NODES[id];
    if (!node.signal) continue;
    // Closest path vertex to the junction centre.
    let best = 0;
    let bestD = Infinity;
    path.pts.forEach((p, i) => {
      const d = Math.hypot(p.x - node.x, p.z - node.z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const sNode = path.cum[best];
    out.push({ s: sNode - STOP_BACK, node: id, axis: axisOf(path.dirAt(sNode - STOP_BACK - 2)) });
  }
  return out.sort((a, b) => a.s - b.s);
}

/** Highest speed that still lets the vehicle stop for the next red (or late yellow) light. */
export function signalSpeedCap(w: World, stops: StopLine[], s: number, speed: number, brake: number): number {
  let cap = Infinity;
  for (const stop of stops) {
    const d = stop.s - s;
    if (d < -0.5) continue; // already past this stop line
    if (d > 70) break;
    const sig = w.signals.find((x) => x.node === stop.node);
    if (!sig) continue;
    const light = lightFor(sig, stop.axis);
    if (light === 'green') continue;
    const canStop = d > (speed * speed) / (2 * brake) + 0.5;
    if (light === 'red' || canStop) {
      cap = Math.min(cap, d < 0.3 ? 0 : Math.sqrt(2 * brake * Math.max(0, d)));
      break;
    }
  }
  return cap;
}
