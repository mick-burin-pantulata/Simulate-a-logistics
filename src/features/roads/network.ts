import type { V2 } from '../../core/math';
import { roundCorners } from '../../core/path';

/**
 * City road graph. Nodes are junctions, edges are two-way roads. Vehicles drive on the
 * left (Thai left-hand traffic): each direction's lane is LANE_OFFSET to the left of the
 * centre line. Routes never U-turn at a junction.
 */
export interface RoadNode {
  id: string;
  x: number;
  z: number;
  /** Signal-controlled junction. */
  signal: boolean;
}

export const ROAD_WIDTH = 9;
export const LANE_OFFSET = 2;

const ROW_Z = { N: -260, M: -71, S: 66 };
const COL_X = { W2: -300, W1: -125, C: 0, E1: 125, E2: 300 };
const SIGNALS = new Set(['M_W1', 'M_C', 'M_E1', 'S_W1', 'S_C', 'S_E1']);

export const ROAD_NODES: Record<string, RoadNode> = {};
for (const [r, z] of Object.entries(ROW_Z)) {
  for (const [c, x] of Object.entries(COL_X)) {
    const id = `${r}_${c}`;
    ROAD_NODES[id] = { id, x, z, signal: SIGNALS.has(id) };
  }
}
/** Highway south out of town; HWX is off the map where trucks come and go. */
ROAD_NODES.HW = { id: 'HW', x: 0, z: 330, signal: false };
ROAD_NODES.HWX = { id: 'HWX', x: 0, z: 620, signal: false };

const row = (r: string) => ['W2', 'W1', 'C', 'E1', 'E2'].map((c) => `${r}_${c}`);
const pairs = (ids: string[]): [string, string][] => ids.slice(1).map((id, i) => [ids[i], id]);

export const ROAD_EDGES: [string, string][] = [
  ...pairs(row('N')),
  ...pairs(row('M')),
  ...pairs(row('S')),
  ...pairs(['N_W2', 'M_W2', 'S_W2']),
  ...pairs(['N_W1', 'M_W1', 'S_W1']),
  ['N_C', 'M_C'], // the factory sits between M_C and S_C, so no through road
  ...pairs(['N_E1', 'M_E1', 'S_E1']),
  ...pairs(['N_E2', 'M_E2', 'S_E2']),
  ['S_C', 'HW'],
  ['HW', 'HWX'],
];

const ADJ = new Map<string, string[]>();
for (const [a, b] of ROAD_EDGES) {
  ADJ.set(a, [...(ADJ.get(a) ?? []), b]);
  ADJ.set(b, [...(ADJ.get(b) ?? []), a]);
}

/** A directed road, `from` → `to`. */
export interface EdgeRef {
  from: string;
  to: string;
}

export const edgeDir = (e: EdgeRef): V2 => {
  const a = ROAD_NODES[e.from];
  const b = ROAD_NODES[e.to];
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
};
export const edgeLength = (e: EdgeRef) => {
  const a = ROAD_NODES[e.from];
  const b = ROAD_NODES[e.to];
  return Math.hypot(b.x - a.x, b.z - a.z);
};
/** Unit vector to the left of a direction (left-hand traffic keeps to this side). */
export const leftOf = (d: V2): V2 => ({ x: d.z, z: -d.x });

/** Point `at` metres along a directed edge, `side` metres left of the centre line. */
export function edgePoint(e: EdgeRef, at: number, side = LANE_OFFSET): V2 {
  const a = ROAD_NODES[e.from];
  const d = edgeDir(e);
  const l = leftOf(d);
  return { x: a.x + d.x * at + l.x * side, z: a.z + d.z * at + l.z * side };
}

/** Lane corner at `node` when turning from `prev` to `next` (mitred offset of both lanes). */
function laneCorner(prev: string, node: string, next: string): V2 {
  const n = ROAD_NODES[node];
  const lin = leftOf(edgeDir({ from: prev, to: node }));
  const lout = leftOf(edgeDir({ from: node, to: next }));
  const dot = lin.x * lout.x + lin.z * lout.z;
  const k = LANE_OFFSET / (1 + Math.max(-0.9, dot));
  return { x: n.x + (lin.x + lout.x) * k, z: n.z + (lin.z + lout.z) * k };
}

/** Where a route starts: partway along a directed edge, optionally from an off-road prefix. */
export interface RouteStart {
  edge: EdgeRef;
  at: number;
  prefix?: V2[];
}

/** Where a route ends: partway along a directed edge, optionally followed by an off-road suffix. */
export interface RouteGoal {
  edge: EdgeRef;
  at: number;
  suffix?: V2[];
}

export interface Route {
  points: V2[];
  /** Junctions passed through, in order (for signal stop lines). */
  junctions: string[];
}

const key = (prev: string, cur: string) => `${prev}>${cur}`;

/**
 * Shortest no-U-turn route from any of `starts` to any of `goals`
 * (Dijkstra over directed states). Returns null if unreachable.
 */
export function planRoute(starts: RouteStart[], goals: RouteGoal[]): Route | null {
  let best: { cost: number; start: RouteStart; goal: RouteGoal; nodes: string[] } | null = null;

  // Same directed edge, goal ahead of start: no junctions at all.
  for (const s of starts) {
    for (const g of goals) {
      if (s.edge.from === g.edge.from && s.edge.to === g.edge.to && g.at >= s.at) {
        const cost = g.at - s.at;
        if (!best || cost < best.cost) best = { cost, start: s, goal: g, nodes: [s.edge.from, s.edge.to] };
      }
    }
  }

  const dist = new Map<string, number>();
  const prevState = new Map<string, string | null>();
  const open: { k: string; prev: string; cur: string; cost: number }[] = [];
  const startOf = new Map<string, RouteStart>();
  for (const s of starts) {
    const k = key(s.edge.from, s.edge.to);
    const cost = edgeLength(s.edge) - s.at;
    if (cost < (dist.get(k) ?? Infinity)) {
      dist.set(k, cost);
      prevState.set(k, null);
      startOf.set(k, s);
      open.push({ k, prev: s.edge.from, cur: s.edge.to, cost });
    }
  }

  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const st = open.shift()!;
    if (st.cost > (dist.get(st.k) ?? Infinity)) continue;
    if (best && st.cost >= best.cost) break;

    for (const g of goals) {
      if (g.edge.from === st.cur && g.edge.to !== st.prev) {
        const cost = st.cost + g.at;
        if (!best || cost < best.cost) {
          // Rebuild the node chain back to the start edge.
          const chain: string[] = [st.cur];
          let k: string | null = st.k;
          let first = st.k;
          while (k) {
            const [p] = k.split('>');
            chain.push(p);
            first = k;
            k = prevState.get(k) ?? null;
          }
          chain.reverse();
          best = { cost, start: startOf.get(first)!, goal: g, nodes: [...chain, g.edge.to] };
        }
      }
    }

    const nbrs = ADJ.get(st.cur) ?? [];
    for (const next of nbrs) {
      if (next === st.prev && nbrs.length > 1) continue; // no U-turns
      const k = key(st.cur, next);
      const cost = st.cost + edgeLength({ from: st.cur, to: next });
      if (cost < (dist.get(k) ?? Infinity)) {
        dist.set(k, cost);
        prevState.set(k, st.k);
        open.push({ k, prev: st.cur, cur: next, cost });
      }
    }
  }

  if (!best) return null;
  const { start, goal, nodes } = best;
  const pts: V2[] = [...(start.prefix ?? []), edgePoint(start.edge, start.at)];
  for (let i = 1; i < nodes.length - 1; i++) pts.push(laneCorner(nodes[i - 1], nodes[i], nodes[i + 1]));
  pts.push(edgePoint(goal.edge, goal.at), ...(goal.suffix ?? []));
  return { points: roundCorners(pts, 7, 8), junctions: nodes.slice(1, -1) };
}
