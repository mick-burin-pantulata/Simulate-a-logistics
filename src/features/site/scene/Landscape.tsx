import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, InstancedMesh, Object3D } from 'three';
import { pick, rand } from '../../../core/math';
import { chainLinkCanvas, repeatingTexture } from '../../../shared/canvasTexture';
import { lampHeadMaterial, lightPoolMaterial } from '../../../shared/nightMaterials';
import { GroundStrip } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { STAFF_LOTS } from '../../city/layout';
import { ENTRY_GATE, EXIT_GATE, SITE, ZONES, type Rect } from '../layout';

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
      [{ x: minX, z: maxZ }, { x: ENTRY_GATE.minX, z: maxZ }],
      [{ x: ENTRY_GATE.maxX, z: maxZ }, { x: EXIT_GATE.minX, z: maxZ }],
      [{ x: EXIT_GATE.maxX, z: maxZ }, { x: maxX, z: maxZ }],
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


/** Staff car park with painted bays and parked cars. */
/** Staff car park surface and bay lines; the parked cars themselves are real (traffic/cars.ts). */
export function CarPark({ area = ZONES.carParkWest }: { area?: Rect }) {
  const lot = STAFF_LOTS.find((l) => (area.minX < 0 ? l.side === 'W' : l.side === 'E'))!;
  return (
    <group>
      <mesh position={[(area.minX + area.maxX) / 2, -0.015, (area.minZ + area.maxZ) / 2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[area.maxX - area.minX, area.maxZ - area.minZ]} />
        <meshStandardMaterial color={THEME.asphalt} />
      </mesh>
      {lot.spots.map((b, i) => (
        <GroundStrip key={i} a={{ x: b.x - 1.4, z: b.z - 2.4 }} b={{ x: b.x - 1.4, z: b.z + 2.4 }} width={0.12} color={THEME.paintWhite} y={0.01} />
      ))}
    </group>
  );
}

/** Street lamps, mirrored about the centre line. */
const LAMP_HALF = [
  { x: 30, z: 34 },
  { x: 55, z: 52 },
  { x: 60, z: 30 },
  { x: 96, z: 30 },
  { x: 74, z: 8 },
  { x: 40, z: 12 },
  { x: 40, z: -18 },
  { x: 40, z: -44 },
  { x: 90, z: -10 },
  { x: 90, z: -54 },
  { x: 118, z: 20 },
  { x: 118, z: -40 },
];
const LAMPS = [...LAMP_HALF, ...LAMP_HALF.map((p) => ({ x: -p.x, z: p.z }))];

export function LampPosts() {
  return (
    <group>
      {LAMPS.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 7, 8]} />
            <meshStandardMaterial color={THEME.steel} metalness={0.3} />
          </mesh>
          <mesh position={[0, 7.05, 0]} material={lampHeadMaterial}>
            <boxGeometry args={[0.9, 0.15, 0.4]} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]} material={lightPoolMaterial} renderOrder={1}>
            <planeGeometry args={[16, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
