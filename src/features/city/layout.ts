import type { V2 } from '../../core/math';
import { edgeDir, edgePoint, type EdgeRef, type RouteGoal, type RouteStart } from '../roads/network';
import type { Rect } from '../site/layout';

/**
 * Everything in town that vehicles drive to. Each facility sits on the LEFT side of a
 * directed road edge (the side you can turn into under left-hand traffic), `at` metres
 * from the edge's start. Its lot is generated from that, so buildings, parking spots and
 * truck bays always line up with the road.
 */
export type FacilityKind = 'house' | 'apartment' | 'store' | 'supplier' | 'staffLot' | 'gas';

export interface Spot extends V2 {
  heading: number;
  /** Off-road waypoints from the lot entrance to just in front of the spot. */
  approach: V2[];
}

export interface Facility {
  id: string;
  kind: FacilityKind;
  name: string;
  edge: EdgeRef;
  at: number;
  /** Lot width along the road and depth away from it. */
  width: number;
  depth: number;
  lot: Rect;
  /** Car parking spots. */
  spots: Spot[];
  /** Pull-through truck bay (stores and suppliers). */
  truckBay: Spot | null;
  /** Extra waypoints between the road and the spots (e.g. through a fence gate). */
  via: V2[];
  /** Staff car parks: which side of the factory. */
  side: 'W' | 'E' | null;
  color: string;
}

const LOT_SETBACK = 6;
const headingOf = (e: EdgeRef) => {
  const d = edgeDir(e);
  return Math.atan2(d.x, d.z);
};

function lotRect(edge: EdgeRef, at: number, width: number, depth: number): Rect {
  const pts = [
    edgePoint(edge, at - width / 2, LOT_SETBACK),
    edgePoint(edge, at + width / 2, LOT_SETBACK),
    edgePoint(edge, at - width / 2, LOT_SETBACK + depth),
    edgePoint(edge, at + width / 2, LOT_SETBACK + depth),
  ];
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minZ: Math.min(...pts.map((p) => p.z)),
    maxZ: Math.max(...pts.map((p) => p.z)),
  };
}

function facility(
  id: string,
  kind: FacilityKind,
  name: string,
  from: string,
  to: string,
  at: number,
  width: number,
  depth: number,
  color = '#4c6ef5',
): Facility {
  const edge = { from, to };
  const h = headingOf(edge);
  let spots: Spot[] = [];
  // Bays in a row facing the road, reached from an aisle just inside the lot.
  const bayRow = (n: number, first: number, gap: number, offset: number): Spot[] =>
    Array.from({ length: n }, (_, i) => {
      const along = first + i * gap;
      return { ...edgePoint(edge, along, offset), heading: h + Math.PI / 2, approach: [edgePoint(edge, along, offset - 3.5)] };
    });
  if (kind === 'house') spots = [{ ...edgePoint(edge, at + 3, 6.3), heading: h, approach: [] }];
  if (kind === 'apartment') spots = bayRow(8, at - 14, 4, 11);
  if (kind === 'store') spots = bayRow(Math.floor((width - 8) / 3.2), at - width / 2 + 4, 3.2, 11.5);
  const truckBay = kind === 'store' || kind === 'supplier' ? { ...edgePoint(edge, at, depth - 6), heading: h, approach: [] } : null;
  return { id, kind, name, edge, at, width, depth, lot: lotRect(edge, at, width, depth), spots, truckBay, via: [], side: null, color };
}

// ---- Shops (west block) -----------------------------------------------------

export const STORES: Facility[] = [
  facility('store-bigmart', 'store', 'บิ๊กมาร์ท', 'S_W2', 'S_W1', 92, 46, 36, '#dc2626'),
  facility('store-mini', 'store', 'มินิมาร์ท 24', 'S_W2', 'S_W1', 132, 30, 30, '#16a34a'),
  facility('store-central', 'store', 'ห้างเซ็นทรัล', 'M_W2', 'S_W2', 66, 38, 40, '#7c3aed'),
  facility('store-homepro', 'store', 'โฮมโปร', 'M_W1', 'M_W2', 60, 40, 35, '#f97316'),
  facility('store-wholesale', 'store', 'ร้านค้าส่งนครชัย', 'M_W1', 'M_W2', 130, 40, 30, '#0891b2'),
];

// ---- Suppliers (east industrial block) --------------------------------------

export const SUPPLIERS: Facility[] = [
  facility('sup-pack', 'supplier', 'ไทยแพ็คเกจจิ้ง', 'S_E1', 'S_E2', 50, 60, 40, '#2563eb'),
  facility('sup-chem', 'supplier', 'สยามเคมีภัณฑ์', 'S_E1', 'S_E2', 130, 60, 40, '#0d9488'),
  facility('sup-steel', 'supplier', 'บางนาสตีล', 'M_E2', 'M_E1', 90, 60, 40, '#64748b'),
];

// ---- Homes (north residential band) -----------------------------------------

const HOUSE_COLORS = ['#f2e8cf', '#e9d8c4', '#dfe7f2', '#f6dcd0', '#e4efe0'];
const houses = (from: string, to: string, prefix: string): Facility[] =>
  [22, 44, 66, 88].map((at, i) =>
    facility(`${prefix}-${i}`, 'house', `บ้านเลขที่ ${prefix.toUpperCase()}${i + 1}`, from, to, at, 18, 22, HOUSE_COLORS[i % HOUSE_COLORS.length]),
  );

export const HOMES: Facility[] = [
  ...houses('M_W1', 'M_C', 'a'),
  ...houses('M_C', 'M_E1', 'b'),
  ...houses('N_C', 'N_W1', 'c'),
  ...houses('N_E1', 'N_C', 'd'),
  facility('apt-nw1', 'apartment', 'คอนโดสุขใจ', 'N_W1', 'N_W2', 50, 40, 50, '#c7d2fe'),
  facility('apt-nw2', 'apartment', 'อพาร์ตเมนต์ร่มไม้', 'N_W1', 'N_W2', 120, 40, 50, '#fde68a'),
  facility('apt-ne1', 'apartment', 'แฟลตพนักงาน', 'N_E2', 'N_E1', 55, 40, 50, '#bbf7d0'),
  facility('apt-ne2', 'apartment', 'คอนโดริมทาง', 'N_E2', 'N_E1', 125, 40, 50, '#fecaca'),
];

/** People who can live in each home. */
export const homeCapacity = (f: Facility) => (f.kind === 'house' ? 3 : 10);

// ---- Factory staff car parks (inside the fence, reached through a side gate) ----

function staffLot(id: string, side: 'W' | 'E', from: string, to: string, at: number): Facility {
  const f = facility(id, 'staffLot', side === 'W' ? 'ลานจอดพนักงาน (ตะวันตก)' : 'ลานจอดพนักงาน (ตะวันออก)', from, to, at, 8, 4);
  const s = side === 'W' ? 1 : -1;
  const gateX = s * -108;
  const aisleX = s * -105;
  f.side = side;
  f.via = [{ x: gateX, z: -32 }];
  // Four rows of nine bays facing two aisles.
  const rows: [number, number][] = [
    [-46, -41],
    [-36, -41],
    [-28, -23],
    [-18, -23],
  ];
  f.spots = rows.flatMap(([z, aisle]) =>
    Array.from({ length: 9 }, (_, i) => {
      const x = s * (-101 + i * 2.8);
      return {
        x,
        z,
        heading: z < aisle ? Math.PI : 0,
        approach: [{ x: aisleX, z: -32 }, { x: aisleX, z: aisle }, { x, z: aisle }],
      };
    }),
  );
  return f;
}

export const STAFF_LOTS: Facility[] = [staffLot('lot-w', 'W', 'M_W1', 'S_W1', 39), staffLot('lot-e', 'E', 'S_E1', 'M_E1', 98)];

export const GAS_STATION = facility('gas', 'gas', 'ปั๊มน้ำมัน', 'S_C', 'HW', 120, 40, 40, '#e11d48');

export const FACILITIES: Facility[] = [...STORES, ...SUPPLIERS, ...HOMES, ...STAFF_LOTS, GAS_STATION];
export const facilityById = new Map(FACILITIES.map((f) => [f.id, f]));

// ---- Route endpoints ---------------------------------------------------------

/** Off-road waypoints from the lane-side entrance to a parking spot (spot included). */
const toSpot = (f: Facility, spot: Spot): V2[] => [...f.via, ...spot.approach, { x: spot.x, z: spot.z }];

/** Drive from the road into a parking spot. */
export function carArrival(f: Facility, spot: Spot): RouteGoal {
  const entry = f.kind === 'house' ? f.at - 10 : f.at - 12;
  const pts = toSpot(f, spot);
  return { edge: f.edge, at: entry, suffix: [edgePoint(f.edge, entry + 5, 5.5), ...pts] };
}

/** Pull out of a parking spot and rejoin the road, carrying on in the edge's direction. */
export function carDeparture(f: Facility, spot: Spot): RouteStart {
  const pts = toSpot(f, spot).reverse();
  const exit = f.kind === 'house' ? f.at + 14 : f.at + 16;
  return { edge: f.edge, at: exit, prefix: [...pts, edgePoint(f.edge, exit - 5, 5.5)] };
}

/** Trucks pull through the lot: in at one end, stop at the bay, out at the other. */
export function truckArrival(f: Facility): RouteGoal {
  return { edge: f.edge, at: f.at - 26, suffix: [edgePoint(f.edge, f.at - 14, 9), f.truckBay!] };
}

export function truckDeparture(f: Facility): RouteStart {
  return { edge: f.edge, at: f.at + 28, prefix: [f.truckBay!, edgePoint(f.edge, f.at + 14, 9)] };
}
