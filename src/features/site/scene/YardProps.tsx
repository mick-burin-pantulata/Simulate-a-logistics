import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Group, InstancedMesh, Object3D, SRGBColorSpace } from 'three';
import { pick, rand } from '../../../core/math';
import { FONT } from '../../../shared/canvasTexture';
import { THEME } from '../../../shared/theme';
import { ROAD, SITE } from '../layout';

type Vec3 = [number, number, number];

const BOX_TONES = ['#8a5a2b', '#9c6a36', '#7c4f25'];
const WRAP_TONES = ['#2f5fb3', '#c9d0f0'];

/** Clusters of loose pallets and wrapped loads along the south edge of the yard. */
function PalletStacks({ clusters }: { clusters: { x: number; z: number }[] }) {
  const boxes = useRef<InstancedMesh>(null);
  const pallets = useRef<InstancedMesh>(null);

  const items = useMemo(() => {
    const out: { x: number; z: number; levels: number; color: string }[] = [];
    for (const c of clusters) {
      const n = Math.floor(rand(3, 7));
      for (let i = 0; i < n; i++) {
        const wrapped = Math.random() < 0.3;
        out.push({
          x: c.x + (i % 3) * 1.5 + rand(-0.15, 0.15),
          z: c.z + Math.floor(i / 3) * 1.6 + rand(-0.15, 0.15),
          levels: Math.random() < 0.3 ? 2 : 1,
          color: wrapped ? pick(WRAP_TONES) : pick(BOX_TONES),
        });
      }
    }
    return out;
  }, [clusters]);

  const boxCount = items.reduce((s, i) => s + i.levels, 0);

  useLayoutEffect(() => {
    const d = new Object3D();
    const c = new Color();
    let b = 0;
    items.forEach((it, i) => {
      d.position.set(it.x, 0.08, it.z);
      d.rotation.y = rand(-0.15, 0.15);
      d.updateMatrix();
      pallets.current!.setMatrixAt(i, d.matrix);
      for (let l = 0; l < it.levels; l++) {
        d.position.set(it.x, 0.16 + 0.45 + l * 0.92, it.z);
        d.updateMatrix();
        boxes.current!.setMatrixAt(b, d.matrix);
        boxes.current!.setColorAt(b++, c.set(it.color));
      }
    });
    pallets.current!.instanceMatrix.needsUpdate = true;
    boxes.current!.instanceMatrix.needsUpdate = true;
    boxes.current!.instanceColor!.needsUpdate = true;
  }, [items]);

  return (
    <group>
      <instancedMesh ref={pallets} args={[undefined, undefined, items.length]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.16, 1.2]} />
        <meshStandardMaterial color="#6b4a2a" />
      </instancedMesh>
      <instancedMesh ref={boxes} args={[undefined, undefined, boxCount]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.9, 1.05]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** Wire mesh of one roll cage (open front), as line segments. */
function cageGeometry() {
  const w = 0.8;
  const d = 0.7;
  const h = 1.6;
  const pts: number[] = [];
  const seg = (a: Vec3, b: Vec3) => pts.push(...a, ...b);
  for (let y = 0.2; y <= h + 0.01; y += 0.2) {
    seg([-w / 2, y, -d / 2], [w / 2, y, -d / 2]);
    seg([-w / 2, y, -d / 2], [-w / 2, y, d / 2]);
    seg([w / 2, y, -d / 2], [w / 2, y, d / 2]);
  }
  for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 4) seg([x, 0.2, -d / 2], [x, h, -d / 2]);
  for (const sx of [-1, 1]) for (let z = -d / 2; z <= d / 2 + 0.01; z += d / 3) seg([(sx * w) / 2, 0.2, z], [(sx * w) / 2, h, z]);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}

function RollCages({ origin, cols, rows }: { origin: { x: number; z: number }; cols: number; rows: number }) {
  const geometry = useMemo(cageGeometry, []);
  const cages = useMemo(() => {
    const out: { x: number; z: number; load: boolean }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) out.push({ x: origin.x + c * 1.05, z: origin.z + r * 0.95, load: Math.random() < 0.25 });
    return out;
  }, [origin, cols, rows]);
  return (
    <group>
      {cages.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation-y={-0.5}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.85, 0.12, 0.75]} />
            <meshStandardMaterial color={THEME.palletBlue} />
          </mesh>
          <lineSegments geometry={geometry}>
            <lineBasicMaterial color="#aab4e6" />
          </lineSegments>
          {c.load && (
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.55, 0.55, 0.5]} />
              <meshStandardMaterial color="#9c6a36" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** Floating location pin that bobs gently. */
function MapPin({ x, z, phase = 0 }: { x: number; z: number; phase?: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    ref.current!.position.y = 3.2 + Math.sin(clock.elapsedTime * 2 + phase) * 0.18;
  });
  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[0.55, 20, 14]} />
          <meshStandardMaterial color="#2445b5" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.6, 0]} rotation-x={Math.PI}>
          <coneGeometry args={[0.42, 0.9, 20]} />
          <meshStandardMaterial color="#2445b5" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.05, 0.5]}>
          <sphereGeometry args={[0.16, 12, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.45, 20]} />
        <meshBasicMaterial color="#1a2250" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

function billboardTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1f6b46';
  ctx.fillRect(0, 0, 1024, 384);
  ctx.strokeStyle = '#e8f5ee';
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, 984, 344);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 italic 120px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('LogiSim Park', 70, 150);
  ctx.font = `500 56px ${FONT}`;
  ctx.fillText('ทางเข้าโรงงาน 200 ม. · Truck entry', 74, 280);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Roadside sign outside the fence. */
function Billboard({ x, z }: { x: number; z: number }) {
  const texture = useMemo(billboardTexture, []);
  return (
    <group position={[x, 0, z]} rotation-y={-0.25}>
      {[-3.2, 3.2].map((px) => (
        <mesh key={px} position={[px, 2.6, -0.1]} castShadow>
          <boxGeometry args={[0.25, 5.2, 0.25]} />
          <meshStandardMaterial color="#3b4370" />
        </mesh>
      ))}
      <mesh position={[0, 5, 0]} castShadow>
        <boxGeometry args={[9, 3.4, 0.2]} />
        <meshStandardMaterial color="#1f6b46" />
      </mesh>
      <mesh position={[0, 5, 0.11]}>
        <planeGeometry args={[9, 3.4]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

const STACK_CLUSTERS = [
  { x: -39, z: 51.5 },
  { x: -10, z: 52 },
  { x: 2, z: 52 },
  { x: 30, z: 51.5 },
];

export function YardProps() {
  return (
    <group>
      <PalletStacks clusters={STACK_CLUSTERS} />
      <RollCages origin={{ x: -28, z: 51.6 }} cols={8} rows={3} />
      <MapPin x={-37.5} z={52.5} />
      <MapPin x={3.5} z={53} phase={1.5} />
      <MapPin x={31.5} z={52.5} phase={3} />
      <Billboard x={-58} z={(SITE.maxZ + ROAD.minZ) / 2 + 0.3} />
    </group>
  );
}
