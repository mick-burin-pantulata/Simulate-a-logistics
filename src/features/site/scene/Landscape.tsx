import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, InstancedMesh, Object3D } from 'three';
import { pick, rand } from '../../../core/math';
import { chainLinkCanvas, repeatingTexture } from '../../../shared/canvasTexture';
import { GroundStrip } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { GATE, SITE, ZONES, type Rect } from '../layout';

const FENCE_H = 2.2;

/** Perimeter fence with an opening at the gate. */
export function Fence() {
  const posts = useRef<InstancedMesh>(null);
  const runs = useMemo(() => {
    const { minX, maxX, minZ, maxZ } = SITE;
    return [
      [{ x: minX, z: minZ }, { x: maxX, z: minZ }],
      [{ x: minX, z: minZ }, { x: minX, z: maxZ }],
      [{ x: maxX, z: minZ }, { x: maxX, z: maxZ }],
      [{ x: minX, z: maxZ }, { x: GATE.minX, z: maxZ }],
      [{ x: GATE.maxX, z: maxZ }, { x: maxX, z: maxZ }],
    ];
  }, []);

  const meshTextures = useMemo(() => {
    const canvas = chainLinkCanvas();
    return runs.map(([a, b]) => repeatingTexture(canvas, Math.hypot(b.x - a.x, b.z - a.z) / 1.1, FENCE_H / 1.1));
  }, [runs]);

  const postPositions = useMemo(
    () =>
      runs.flatMap(([a, b]) => {
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        const n = Math.ceil(len / 4);
        return Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n }));
      }),
    [runs],
  );

  useLayoutEffect(() => {
    const d = new Object3D();
    postPositions.forEach((p, i) => {
      d.position.set(p.x, FENCE_H / 2, p.z);
      d.updateMatrix();
      posts.current!.setMatrixAt(i, d.matrix);
    });
    posts.current!.instanceMatrix.needsUpdate = true;
  }, [postPositions]);

  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, undefined, postPositions.length]} castShadow>
        <boxGeometry args={[0.12, FENCE_H, 0.12]} />
        <meshStandardMaterial color="#56609a" metalness={0.3} />
      </instancedMesh>
      {runs.map(([a, b], i) => {
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        return (
          <mesh
            key={i}
            position={[(a.x + b.x) / 2, FENCE_H / 2, (a.z + b.z) / 2]}
            rotation-y={-Math.atan2(b.z - a.z, b.x - a.x)}
          >
            <planeGeometry args={[len, FENCE_H]} />
            <meshStandardMaterial map={meshTextures[i]} alphaTest={0.4} side={DoubleSide} transparent />
          </mesh>
        );
      })}
    </group>
  );
}

/** Trees outside the fence and around the office. */
export function Trees() {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);

  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number }[] = [];
    const { minX, maxX, minZ, maxZ } = SITE;
    for (let x = minX; x <= maxX; x += 9) out.push({ x: x + rand(-1, 1), z: minZ - 5 + rand(-1, 1), s: rand(0.8, 1.3) });
    for (let z = minZ; z <= maxZ - 6; z += 9) {
      out.push({ x: minX - 5 + rand(-1, 1), z, s: rand(0.8, 1.3) });
      out.push({ x: maxX + 5 + rand(-1, 1), z, s: rand(0.8, 1.3) });
    }
    // Garden around the office
    const o = ZONES.office;
    for (let z = o.minZ; z <= o.maxZ; z += 6) out.push({ x: o.minX - 3.5, z, s: rand(0.7, 1) });
    for (let x = o.minX; x <= o.maxX; x += 6) out.push({ x, z: o.maxZ + 3.5, s: rand(0.7, 1) });
    return out;
  }, []);

  useLayoutEffect(() => {
    const d = new Object3D();
    const c = new Color();
    trees.forEach((t, i) => {
      d.position.set(t.x, 1.2 * t.s, t.z);
      d.scale.setScalar(t.s);
      d.updateMatrix();
      trunks.current!.setMatrixAt(i, d.matrix);
      d.position.set(t.x, 3.6 * t.s, t.z);
      d.updateMatrix();
      crowns.current!.setMatrixAt(i, d.matrix);
      crowns.current!.setColorAt(i, c.set(pick(THEME.tree)));
    });
    trunks.current!.instanceMatrix.needsUpdate = true;
    crowns.current!.instanceMatrix.needsUpdate = true;
    crowns.current!.instanceColor!.needsUpdate = true;
  }, [trees]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.2, 0.28, 2.4, 6]} />
        <meshStandardMaterial color={THEME.trunk} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, trees.length]} castShadow>
        <icosahedronGeometry args={[2, 0]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

const CAR_COLORS = ['#f8fafc', '#1f2937', '#9ca3af', '#b91c1c', '#1d4ed8', '#78716c', '#e5e7eb', '#0f766e'];

/** Staff car park with painted bays and parked cars. */
export function CarPark({ area = ZONES.carPark }: { area?: Rect }) {
  const bodies = useRef<InstancedMesh>(null);
  const cabins = useRef<InstancedMesh>(null);

  const { bays, cars } = useMemo(() => {
    const bays: { x: number; z: number }[] = [];
    for (const z of [area.minZ + 4, area.minZ + 12, area.maxZ - 12, area.maxZ - 4]) {
      for (let x = area.minX + 2; x <= area.maxX - 2; x += 2.8) bays.push({ x, z });
    }
    const cars = bays.filter(() => Math.random() < 0.7);
    return { bays, cars };
  }, [area]);

  useLayoutEffect(() => {
    const d = new Object3D();
    const c = new Color();
    cars.forEach((car, i) => {
      d.position.set(car.x, 0.55, car.z);
      d.updateMatrix();
      bodies.current!.setMatrixAt(i, d.matrix);
      bodies.current!.setColorAt(i, c.set(pick(CAR_COLORS)));
      d.position.set(car.x, 1.15, car.z + 0.2);
      d.updateMatrix();
      cabins.current!.setMatrixAt(i, d.matrix);
    });
    bodies.current!.instanceMatrix.needsUpdate = true;
    bodies.current!.instanceColor!.needsUpdate = true;
    cabins.current!.instanceMatrix.needsUpdate = true;
  }, [cars]);

  return (
    <group>
      <mesh position={[(area.minX + area.maxX) / 2, -0.015, (area.minZ + area.maxZ) / 2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[area.maxX - area.minX, area.maxZ - area.minZ]} />
        <meshStandardMaterial color={THEME.asphalt} />
      </mesh>
      {bays.map((b, i) => (
        <GroundStrip key={i} a={{ x: b.x - 1.4, z: b.z - 2.4 }} b={{ x: b.x - 1.4, z: b.z + 2.4 }} width={0.12} color={THEME.paintWhite} y={0.01} />
      ))}
      <instancedMesh ref={bodies} args={[undefined, undefined, cars.length]} castShadow>
        <boxGeometry args={[1.8, 0.7, 4.2]} />
        <meshStandardMaterial metalness={0.4} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={cabins} args={[undefined, undefined, cars.length]} castShadow>
        <boxGeometry args={[1.6, 0.55, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.2} />
      </instancedMesh>
    </group>
  );
}

const LAMPS = [
  { x: -30, z: 30 },
  { x: -5, z: 52 },
  { x: 20, z: 30 },
  { x: 40, z: 52 },
  { x: 58, z: 30 },
  { x: -40, z: -18 },
  { x: 30, z: -18 },
];

export function LampPosts() {
  return (
    <group>
      {LAMPS.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 7, 8]} />
            <meshStandardMaterial color={THEME.steel} metalness={0.3} />
          </mesh>
          <mesh position={[0, 7.05, 0]}>
            <boxGeometry args={[0.9, 0.15, 0.4]} />
            <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
