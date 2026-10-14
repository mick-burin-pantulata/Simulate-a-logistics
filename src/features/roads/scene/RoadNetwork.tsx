import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { MeshStandardMaterial } from 'three';
import { Box, GroundRect, GroundStrip } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { useSimStore } from '../../../store/useSimStore';
import { Dashes } from '../../site/scene/SiteGround';
import { lightFor, type Axis } from '../../traffic/signals';
import { ROAD_EDGES, ROAD_NODES, ROAD_WIDTH } from '../network';

const HALF = ROAD_WIDTH / 2;
/** Keep lane paint out of the junction box. */
const JUNCTION_CLEAR = HALF + 1.5;

function RoadSegment({ a, b }: { a: string; b: string }) {
  const p = ROAD_NODES[a];
  const q = ROAD_NODES[b];
  const alongX = p.z === q.z;
  const sign = alongX ? Math.sign(q.x - p.x) : Math.sign(q.z - p.z);
  const from = (alongX ? p.x : p.z) + sign * JUNCTION_CLEAR;
  const to = (alongX ? q.x : q.z) - sign * JUNCTION_CLEAR;
  const at = (v: number, off: number) => (alongX ? { x: v, z: p.z + off } : { x: p.x + off, z: v });
  return (
    <group>
      <GroundStrip a={{ x: p.x, z: p.z }} b={{ x: q.x, z: q.z }} width={ROAD_WIDTH} color={THEME.road} y={-0.03} />
      {[-(HALF - 0.4), HALF - 0.4].map((o) => (
        <GroundStrip key={o} a={at(from, o)} b={at(to, o)} width={0.2} color={THEME.paintWhite} y={0.02} />
      ))}
      {alongX ? <Dashes from={from} to={to} z={p.z} /> : <Dashes from={from} to={to} x={p.x} />}
    </group>
  );
}

/** Zebra crossing across one approach of a junction. */
function Crossing({ x, z, alongX }: { x: number; z: number; alongX: boolean }) {
  const stripes = Array.from({ length: 6 }, (_, i) => -HALF + 0.9 + i * 1.45);
  return (
    <group>
      {stripes.map((o) => (
        <mesh key={o} rotation-x={-Math.PI / 2} position={[alongX ? x : x + o, 0.025, alongX ? z + o : z]}>
          <planeGeometry args={alongX ? [2.6, 0.7] : [0.7, 2.6]} />
          <meshBasicMaterial color={THEME.paintWhite} />
        </mesh>
      ))}
    </group>
  );
}

const LAMP_COLORS = { red: '#ef4444', yellow: '#facc15', green: '#22c55e' } as const;

/** Signal pole at a junction corner, showing the light for one axis. */
function SignalPole({ node, x, z, axis, facing }: { node: string; x: number; z: number; axis: Axis; facing: number }) {
  const mats = useRef<(MeshStandardMaterial | null)[]>([]);
  useFrame(() => {
    const sig = useSimStore.getState().world.signals.find((s) => s.node === node);
    if (!sig) return;
    const on = lightFor(sig, axis);
    (['red', 'yellow', 'green'] as const).forEach((c, i) => {
      const m = mats.current[i];
      if (m) m.emissiveIntensity = c === on ? 2.2 : 0.05;
    });
  });
  return (
    <group position={[x, 0, z]} rotation-y={facing}>
      <Box position={[0, 2.2, 0]} size={[0.18, 4.4, 0.18]} color="#2b3157" />
      <Box position={[0, 4.6, 0.15]} size={[0.5, 1.4, 0.35]} color="#1b1f36" />
      {(['red', 'yellow', 'green'] as const).map((c, i) => (
        <mesh key={c} position={[0, 5.05 - i * 0.43, 0.34]}>
          <sphereGeometry args={[0.14, 12, 8]} />
          <meshStandardMaterial
            ref={(m) => void (mats.current[i] = m)}
            color={LAMP_COLORS[c]}
            emissive={LAMP_COLORS[c]}
            emissiveIntensity={0.05}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Every road in town, junction boxes, zebra crossings and traffic signals. */
export function RoadNetwork() {
  const nodes = useMemo(() => Object.values(ROAD_NODES).filter((n) => n.id !== 'HWX'), []);
  const signals = useMemo(() => nodes.filter((n) => n.signal), [nodes]);
  const C = HALF + 1.3;
  return (
    <group>
      {ROAD_EDGES.map(([a, b]) => (
        <RoadSegment key={a + b} a={a} b={b} />
      ))}
      {nodes.map((n) => (
        <GroundRect key={n.id} minX={n.x - HALF} maxX={n.x + HALF} minZ={n.z - HALF} maxZ={n.z + HALF} color={THEME.road} y={-0.025} />
      ))}
      {signals.map((n) => (
        <group key={n.id}>
          <Crossing x={n.x - C} z={n.z} alongX />
          <Crossing x={n.x + C} z={n.z} alongX />
          <Crossing x={n.x} z={n.z - C} alongX={false} />
          <Crossing x={n.x} z={n.z + C} alongX={false} />
          {/* Each pole faces the traffic arriving on its side. */}
          <SignalPole node={n.id} x={n.x - HALF - 1} z={n.z + HALF + 1} axis="NS" facing={Math.PI} />
          <SignalPole node={n.id} x={n.x + HALF + 1} z={n.z - HALF - 1} axis="NS" facing={0} />
          <SignalPole node={n.id} x={n.x + HALF + 1} z={n.z + HALF + 1} axis="EW" facing={-Math.PI / 2} />
          <SignalPole node={n.id} x={n.x - HALF - 1} z={n.z - HALF - 1} axis="EW" facing={Math.PI / 2} />
        </group>
      ))}
    </group>
  );
}
