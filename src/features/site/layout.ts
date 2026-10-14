import type { V2 } from '../../core/math';

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const rectCenter = (r: Rect): V2 => ({ x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 });
export const rectSize = (r: Rect) => ({ w: r.maxX - r.minX, d: r.maxZ - r.minZ });
/** Mirror a rectangle across the site's north–south axis (x = 0). */
export const mirrorX = (r: Rect): Rect => ({ minX: -r.maxX, maxX: -r.minX, minZ: r.minZ, maxZ: r.maxZ });

/**
 * The site is laid out symmetrically about x = 0: warehouse and production in the middle,
 * paired buildings either side. Trucks flow one way, west → east: they enter by the west
 * gate, queue in the west park, dock, check out in the east park and leave by the east gate.
 * +z points toward the public road.
 */
export const SITE: Rect = { minX: -110, maxX: 110, minZ: -60, maxZ: 56 };

/** Public road outside the south fence (left-hand traffic). Trucks use the eastbound lane. */
export const ROAD = { minX: -240, maxX: 240, minZ: 61.5, maxZ: 70.5, eastboundZ: 64, westboundZ: 68 };

/** Local ring road around the compound (west, north and east sides). */
export const RING = { westX: -125, eastX: 125, northZ: -71, width: 8 };

export const ENTRY_GATE = { x: -90, z: SITE.maxZ, minX: -94.5, maxX: -85.5 };
export const EXIT_GATE = { x: 90, z: SITE.maxZ, minX: 85.5, maxX: 94.5 };
export const GUARD_HOUSES = {
  entry: { x: -82, z: 52, w: 4, d: 3.5 },
  exit: { x: 82, z: 52, w: 4, d: 3.5 },
};

export const YARD: Rect = { minX: -100, maxX: 100, minZ: 16, maxZ: 56 };
export const YARD_DOCK_LANE_Z = 40;
export const YARD_EXIT_LANE_Z = 47;

/** Pull-through truck bays: west = queue for a dock, east = weigh-out / seal check before leaving. */
export const WEST_PARK: Rect = { minX: -100, maxX: -46, minZ: 6, maxZ: 56 };
export const EAST_PARK: Rect = mirrorX(WEST_PARK);
export const WEST_BAY_X = [-82, -78, -74, -70, -66];
export const EAST_BAY_X = WEST_BAY_X.map((x) => -x).reverse();
/** Hitch position of a parked truck (facing north). */
export const BAY_CAB_Z = 22;
export const WEST_BAY_ENTRY_Z = 44;
export const PARK_EXIT_Z = 12;
/** Road from the west park back down to the dock lane. */
export const WEST_CROSS_X = -50;

/** Driver lounge (east) and receiving office (west), either side of the dock apron. */
export const LOUNGE: Rect = { minX: 27, maxX: 34, minZ: 19, maxZ: 26 };
export const LOUNGE_DOOR: V2 = { x: 30.5, z: 26.6 };
export const RECEIVING_OFFICE: Rect = mirrorX(LOUNGE);

const office: Rect = { minX: -70, maxX: -45, minZ: -14, maxZ: 8 };
const canteen: Rect = { minX: -70, maxX: -48, minZ: -50, maxZ: -24 };
const carParkWest: Rect = { minX: -104, maxX: -78, minZ: -50, maxZ: -14 };

export const ZONES = {
  warehouse: { minX: -25, maxX: 25, minZ: -16, maxZ: 16 } as Rect,
  production: { minX: -25, maxX: 25, minZ: -50, maxZ: -22 } as Rect,
  office,
  maintenance: mirrorX(office),
  canteen,
  utility: mirrorX(canteen),
  carParkWest,
  carParkEast: mirrorX(carParkWest),
};

/** Pedestrian walkway graph (mirrored west/east, joined behind the production hall). */
export const WALK_NODES: Record<string, V2> = {
  parkingLotW: { x: -91, z: -32 },
  carParkW: { x: -76, z: -20 },
  jWM: { x: -38, z: -20 },
  jWS: { x: -38, z: 0 },
  jWN: { x: -38, z: -37 },
  jWF: { x: -38, z: -55 },
  office: { x: -43, z: -3 },
  canteen: { x: -46, z: -37 },
  warehouseDoorW: { x: -27, z: 0 },
  productionDoor: { x: -27, z: -47 },

  parkingLotE: { x: 91, z: -32 },
  carParkE: { x: 76, z: -20 },
  jEM: { x: 38, z: -20 },
  jES: { x: 38, z: 0 },
  jEN: { x: 38, z: -37 },
  jEF: { x: 38, z: -55 },
  maintenance: { x: 43, z: -3 },
  warehouseDoorE: { x: 27, z: 0 },
};

export const WALK_EDGES: [string, string][] = [
  ['parkingLotW', 'carParkW'],
  ['carParkW', 'jWM'],
  ['jWM', 'jWS'],
  ['jWM', 'jWN'],
  ['jWS', 'office'],
  ['jWS', 'warehouseDoorW'],
  ['jWN', 'canteen'],
  ['jWN', 'productionDoor'],
  ['jWN', 'jWF'],
  ['jWF', 'jEF'],
  ['parkingLotE', 'carParkE'],
  ['carParkE', 'jEM'],
  ['jEM', 'jES'],
  ['jEM', 'jEN'],
  ['jES', 'maintenance'],
  ['jES', 'warehouseDoorE'],
  ['jEN', 'jEF'],
];

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
