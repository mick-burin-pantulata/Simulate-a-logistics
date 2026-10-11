import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, CanvasTexture, Group, type Mesh } from 'three';
import { forward } from '../core/math';
import { AXLE_TO_REAR, CAB_FRONT } from '../features/trucks/routes';
import { useSimStore } from '../store/useSimStore';
import type { EntityKind } from '../world/snapshot';
import type { World } from '../world/types';
import { THEME } from './theme';

type Vec3 = [number, number, number];

/** Box (width, height, length) drawn around each kind of entity. */
const DIMS: Record<EntityKind, Vec3> = {
  truck: [3.4, 4.6, 16],
  agv: [2, 3, 2.8],
  worker: [1, 2.2, 1],
};

function pose(w: World, kind: EntityKind, id: number) {
  if (kind === 'truck') {
    const t = w.trucks.find((x) => x.id === id);
    if (!t) return null;
    const cf = forward(t.cab.heading);
    const tf = forward(t.trailer.heading);
    const front = { x: t.cab.x + cf.x * CAB_FRONT, z: t.cab.z + cf.z * CAB_FRONT };
    const rear = { x: t.trailer.x - tf.x * AXLE_TO_REAR, z: t.trailer.z - tf.z * AXLE_TO_REAR };
    return {
      x: (front.x + rear.x) / 2,
      z: (front.z + rear.z) / 2,
      heading: Math.atan2(front.x - rear.x, front.z - rear.z),
      length: Math.hypot(front.x - rear.x, front.z - rear.z) + 1,
    };
  }
  const e = kind === 'agv' ? w.agvs.find((x) => x.id === id) : w.workers.find((x) => x.id === id);
  return e ? { x: e.x, z: e.z, heading: e.heading, length: DIMS[kind][2] } : null;
}

/** Three short arms at each of the 8 box corners, in a unit box scaled per axis. */
function cornerSegments([w, h, l]: Vec3, arm: number): Vec3[] {
  const pts: Vec3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [0, 1])
      for (const sz of [-1, 1]) {
        const c: Vec3 = [(sx * w) / 2, sy * h, (sz * l) / 2];
        pts.push(c, [c[0] - sx * arm, c[1], c[2]]);
        pts.push(c, [c[0], c[1] + (sy ? -arm : arm), c[2]]);
        pts.push(c, [c[0], c[1], c[2] - sz * arm]);
      }
  return pts;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(110,140,255,0.9)');
  g.addColorStop(0.5, 'rgba(80,110,255,0.35)');
  g.addColorStop(1, 'rgba(60,90,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

export function SelectionBrackets() {
  const sel = useSimStore((s) => s.selected);
  const group = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const texture = useMemo(glowTexture, []);
  const dims = sel ? DIMS[sel.kind] : DIMS.agv;
  const segments = useMemo(() => cornerSegments(dims, Math.min(dims[0], dims[2]) * 0.3), [dims]);

  useFrame(({ clock }) => {
    if (!sel || !group.current) return;
    const p = pose(useSimStore.getState().world, sel.kind, sel.id);
    group.current.visible = !!p;
    if (!p) return;
    group.current.position.set(p.x, 0.05, p.z);
    group.current.rotation.y = p.heading;
    const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.025;
    group.current.scale.set(pulse, 1, (p.length / dims[2]) * pulse);
    glow.current!.scale.set(dims[0] * 2.2, dims[2] * 1.3, 1);
  });

  if (!sel) return null;
  return (
    <group ref={group}>
      <Line points={segments} segments color={THEME.accentGlow} lineWidth={3} toneMapped={false} />
      <mesh ref={glow} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}
