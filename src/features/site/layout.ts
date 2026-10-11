import type { V2 } from '../../core/math';

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const rectCenter = (r: Rect): V2 => ({ x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 });
export const rectSize = (r: Rect) => ({ w: r.maxX - r.minX, d: r.maxZ - r.minZ });

/** Fenced factory compound. +z points toward the public road. */
export const SITE: Rect = { minX: -80, maxX: 80, minZ: -60, maxZ: 56 };

/** Public road outside the south fence (left-hand traffic). */
export const ROAD = { minX: -170, maxX: 170, minZ: 61.5, maxZ: 70.5, eastboundZ: 64, westboundZ: 68 };

export const GATE = { z: SITE.maxZ, x: 50, inX: 48, outX: 52, minX: 45, maxX: 55 };
export const GUARD_HOUSE = { x: 58.5, z: 51, w: 4, d: 3.5 };

export const YARD: Rect = { minX: -42, maxX: 62, minZ: 16, maxZ: 56 };
export const YARD_DOCK_LANE_Z = 40;
export const YARD_EXIT_LANE_Z = 47;

export const ZONES = {
  warehouse: { minX: -25, maxX: 25, minZ: -16, maxZ: 16 } as Rect,
  production: { minX: -25, maxX: 25, minZ: -50, maxZ: -22 } as Rect,
  office: { minX: -70, maxX: -45, minZ: -10, maxZ: 14 } as Rect,
  canteen: { minX: -70, maxX: -48, minZ: -48, maxZ: -26 } as Rect,
  carPark: { minX: -76, maxX: -46, minZ: 22, maxZ: 50 } as Rect,
  utility: { minX: 38, maxX: 70, minZ: -50, maxZ: -24 } as Rect,
};

/** Pedestrian walkway graph. */
export const WALK_NODES: Record<string, V2> = {
  office: { x: -43, z: 2 },
  carPark: { x: -44, z: 30 },
  canteen: { x: -46, z: -37 },
  warehouseDoor: { x: -27, z: 0 },
  productionDoor: { x: -27, z: -36 },
  j1: { x: -35, z: 2 },
  j2: { x: -35, z: 30 },
  j3: { x: -35, z: -37 },
  j4: { x: -35, z: 0 },
};

export const WALK_EDGES: [string, string][] = [
  ['office', 'j1'],
  ['j1', 'j4'],
  ['j4', 'warehouseDoor'],
  ['j1', 'j2'],
  ['j2', 'carPark'],
  ['j4', 'j3'],
  ['j3', 'canteen'],
  ['j3', 'productionDoor'],
];

export const WALK_DESTS = ['office', 'carPark', 'canteen', 'warehouseDoor', 'productionDoor'];

/** Shortest node route between two walkway nodes (excluding the start). */
export function walkRoute(from: string, to: string): V2[] {
  const prev = new Map<string, string>([[from, from]]);
  const queue = [from];
  for (let i = 0; i < queue.length && !prev.has(to); i++) {
    const cur = queue[i];
    for (const [a, b] of WALK_EDGES) {
      const next = a === cur ? b : b === cur ? a : null;
      if (next && !prev.has(next)) {
        prev.set(next, cur);
        queue.push(next);
      }
    }
  }
  const nodes: string[] = [];
  for (let n = to; n !== from; n = prev.get(n)!) nodes.push(n);
  return nodes.reverse().map((n) => ({ ...WALK_NODES[n] }));
}
