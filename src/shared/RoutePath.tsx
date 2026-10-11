import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, InstancedMesh, Object3D } from 'three';
import { Path } from '../core/path';
import { useSimStore } from '../store/useSimStore';
import { THEME } from './theme';

const Y = 0.07;
const DOT_GAP = 2.4;
const DOT_SPEED = 3;
const MAX_DOTS = 160;

/** Flat ribbon following a polyline. */
function ribbon(points: [number, number][], width: number) {
  const n = points.length;
  const pos = new Float32Array(n * 2 * 3);
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0];
    let tz = b[1] - a[1];
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const [x, z] = points[i];
    pos.set([x - tz * width * 0.5, Y, z + tx * width * 0.5, x + tz * width * 0.5, Y, z - tx * width * 0.5], i * 6);
    if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** Glowing route of the selected entity with dots streaming toward its destination. */
export function RoutePath() {
  const points = useSimStore((s) => s.snapshot.selected?.path);
  const kind = useSimStore((s) => s.snapshot.selected?.kind);
  const show = useSimStore((s) => s.settings.showPaths);
  const dots = useRef<InstancedMesh>(null);
  const tmp = useMemo(() => new Object3D(), []);

  const valid = show && points && points.length >= 2;
  const width = kind === 'truck' ? 1.6 : 0.9;
  const geometry = useMemo(() => (valid ? ribbon(points!, width) : null), [valid, points, width]);
  const path = useMemo(() => (valid ? new Path(points!.map(([x, z]) => ({ x, z }))) : null), [valid, points]);

  useLayoutEffect(() => () => geometry?.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!path || !dots.current) return;
    const count = Math.min(MAX_DOTS, Math.floor(path.length / DOT_GAP));
    const shift = (clock.elapsedTime * DOT_SPEED) % DOT_GAP;
    for (let i = 0; i < MAX_DOTS; i++) {
      if (i < count) {
        const p = path.at(i * DOT_GAP + shift);
        tmp.position.set(p.x, Y + 0.02, p.z);
        tmp.scale.setScalar(width / 1.6);
      } else {
        tmp.scale.setScalar(0);
      }
      tmp.rotation.x = -Math.PI / 2;
      tmp.updateMatrix();
      dots.current.setMatrixAt(i, tmp.matrix);
    }
    dots.current.instanceMatrix.needsUpdate = true;
  });

  if (!geometry) return null;
  return (
    <group renderOrder={3}>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={THEME.accent} side={DoubleSide} transparent opacity={0.65} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <instancedMesh ref={dots} args={[undefined, undefined, MAX_DOTS]}>
        <circleGeometry args={[0.32, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
