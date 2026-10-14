import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Matrix4, Object3D } from 'three';
import { Label } from '../../../shared/Label';
import { windowMaterial } from '../../../shared/nightMaterials';
import { Box, GroundRect, GroundStrip } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { useSimStore } from '../../../store/useSimStore';
import { edgeDir, edgePoint } from '../../roads/network';
import { GAS_STATION, HOMES, STORES, SUPPLIERS, type Facility } from '../layout';

/** A box placed relative to a facility's road: `along` metres along the edge, between two offsets from it. */
function lotBox(f: Facility, along: number, len: number, off0: number, off1: number) {
  const c = edgePoint(f.edge, along, (off0 + off1) / 2);
  const d = edgeDir(f.edge);
  const alongX = Math.abs(d.x) > 0.5;
  const depth = Math.abs(off1 - off0);
  return { x: c.x, z: c.z, sx: alongX ? len : depth, sz: alongX ? depth : len };
}

function Lot({ f, color = THEME.asphalt }: { f: Facility; color?: string }) {
  return <GroundRect {...f.lot} color={color} y={-0.015} />;
}

/** Window band all round a box (lit at night). */
function Windows({ x, z, sx, sz, y, h }: { x: number; z: number; sx: number; sz: number; y: number; h: number }) {
  return (
    <>
      <Box position={[x, y, z + sz / 2 + 0.03]} size={[sx - 1, h, 0.06]} color={THEME.window} material={windowMaterial} shadow={false} />
      <Box position={[x, y, z - sz / 2 - 0.03]} size={[sx - 1, h, 0.06]} color={THEME.window} material={windowMaterial} shadow={false} />
      <Box position={[x + sx / 2 + 0.03, y, z]} size={[0.06, h, sz - 1]} color={THEME.window} material={windowMaterial} shadow={false} />
      <Box position={[x - sx / 2 - 0.03, y, z]} size={[0.06, h, sz - 1]} color={THEME.window} material={windowMaterial} shadow={false} />
    </>
  );
}

function House({ f }: { f: Facility }) {
  const b = lotBox(f, f.at - 1, f.width - 6, 9, f.depth + 2);
  return (
    <group>
      <GroundRect {...f.lot} color="#4d7a5a" y={-0.015} />
      <Box position={[b.x, 2, b.z]} size={[b.sx, 4, b.sz]} color={f.color} />
      <Windows x={b.x} z={b.z} sx={b.sx} sz={b.sz} y={2.4} h={1} />
      <mesh position={[b.x, 5.1, b.z]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[Math.max(b.sx, b.sz) * 0.78, 2.4, 4]} />
        <meshStandardMaterial color="#9f3a2c" flatShading />
      </mesh>
    </group>
  );
}

function Apartment({ f }: { f: Facility }) {
  const b = lotBox(f, f.at, f.width - 6, 16, f.depth + 4);
  const floors = 5;
  return (
    <group>
      <Lot f={f} />
      {f.spots.map((s, i) => (
        <GroundStrip key={i} a={{ x: s.x - 1.4, z: s.z }} b={{ x: s.x + 1.4, z: s.z }} width={0.1} color={THEME.paintWhite} y={0.01} />
      ))}
      <Box position={[b.x, floors * 1.6, b.z]} size={[b.sx, floors * 3.2, b.sz]} color={f.color} />
      {Array.from({ length: floors }, (_, i) => (
        <Windows key={i} x={b.x} z={b.z} sx={b.sx} sz={b.sz} y={1.8 + i * 3.2} h={1.2} />
      ))}
      <Box position={[b.x, floors * 3.2 + 0.2, b.z]} size={[b.sx + 0.6, 0.4, b.sz + 0.6]} color={THEME.roofTrim} />
      <Label title={f.name} position={[b.x, floors * 3.2 + 4, b.z]} scale={5} accent="#a5b4fc" />
    </group>
  );
}

const HIDE = new Matrix4().makeScale(0, 0, 0);

/** Pallets stacked at a building's back door; count follows live stock. */
function StockPile({ f, kind, perPallet }: { f: Facility; kind: 'store' | 'supplier'; perPallet: number }) {
  const ref = useRef<InstancedMesh>(null);
  const max = 12;
  const slots = useMemo(() => {
    const o = new Object3D();
    return Array.from({ length: max }, (_, i) => {
      const p = edgePoint(f.edge, f.at - f.width / 2 + 5 + (i % 6) * 1.4, f.depth - 1 + Math.floor(i / 6) * 1.4);
      o.position.set(p.x, 0.5, p.z);
      o.updateMatrix();
      return o.matrix.clone();
    });
  }, [f]);
  useFrame(() => {
    const w = useSimStore.getState().world;
    const stock = kind === 'store' ? w.stores.find((s) => s.id === f.id)?.stock : w.suppliers.find((s) => s.id === f.id)?.stock;
    const n = Math.min(max, Math.round((stock ?? 0) / perPallet));
    slots.forEach((m, i) => ref.current!.setMatrixAt(i, i < n ? m : HIDE));
    ref.current!.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, max]} castShadow>
      <boxGeometry args={[1.1, 1, 1.1]} />
      <meshStandardMaterial color={kind === 'store' ? '#8a5a2b' : '#5b7fb8'} roughness={0.8} />
    </instancedMesh>
  );
}

function Store({ f }: { f: Facility }) {
  const b = lotBox(f, f.at, f.width - 4, f.depth + 1, f.depth + 11);
  const sign = edgePoint(f.edge, f.at, f.depth + 0.6);
  return (
    <group>
      <Lot f={f} />
      {f.spots.map((s, i) => {
        const d = edgeDir(f.edge);
        const ax = Math.abs(d.x) > 0.5;
        return (
          <GroundStrip
            key={i}
            a={ax ? { x: s.x - 1.6, z: s.z - 2 } : { x: s.x - 2, z: s.z - 1.6 }}
            b={ax ? { x: s.x - 1.6, z: s.z + 2 } : { x: s.x + 2, z: s.z - 1.6 }}
            width={0.1}
            color={THEME.paintWhite}
            y={0.01}
          />
        );
      })}
      <Box position={[b.x, 3, b.z]} size={[b.sx, 6, b.sz]} color="#dfe4f5" />
      <Box position={[b.x, 6.2, b.z]} size={[b.sx + 0.6, 0.4, b.sz + 0.6]} color={f.color} />
      <Windows x={b.x} z={b.z} sx={b.sx} sz={b.sz} y={2} h={2.2} />
      <StockPile f={f} kind="store" perPallet={2} />
      <Label title={f.name} subtitle="ร้านค้า" position={[sign.x, 9, sign.z]} scale={6} accent={f.color} />
    </group>
  );
}

function Supplier({ f }: { f: Facility }) {
  const b = lotBox(f, f.at, f.width - 8, f.depth + 1, f.depth + 19);
  const chimney = edgePoint(f.edge, f.at + f.width / 2 - 10, f.depth + 12);
  return (
    <group>
      <Lot f={f} />
      <Box position={[b.x, 4.5, b.z]} size={[b.sx, 9, b.sz]} color="#cfd5ea" />
      <Box position={[b.x, 9.2, b.z]} size={[b.sx + 0.6, 0.4, b.sz + 0.6]} color={f.color} />
      <Windows x={b.x} z={b.z} sx={b.sx} sz={b.sz} y={6.5} h={1.2} />
      <mesh position={[chimney.x, 9, chimney.z]} castShadow>
        <cylinderGeometry args={[0.9, 1.2, 18, 12]} />
        <meshStandardMaterial color="#8d97c7" />
      </mesh>
      <StockPile f={f} kind="supplier" perPallet={3.5} />
      <Label title={f.name} subtitle="ซัพพลายเออร์วัตถุดิบ" position={[b.x, 14, b.z]} scale={7} accent={f.color} />
    </group>
  );
}

function GasStation() {
  const f = GAS_STATION;
  const canopy = lotBox(f, f.at, 22, 10, 26);
  const shop = lotBox(f, f.at, 14, 30, 38);
  return (
    <group>
      <Lot f={f} />
      <Box position={[canopy.x, 5, canopy.z]} size={[canopy.sx, 0.6, canopy.sz]} color="#f1f5f9" />
      <Box position={[canopy.x, 5.35, canopy.z]} size={[canopy.sx + 0.2, 0.2, canopy.sz + 0.2]} color="#e11d48" />
      {[-6, 0, 6].map((o) => {
        const p = edgePoint(f.edge, f.at + o, 18);
        return (
          <group key={o}>
            <Box position={[p.x, 2.5, p.z]} size={[0.4, 5, 0.4]} color="#cbd5e1" />
            <Box position={[p.x, 0.8, p.z]} size={[0.8, 1.6, 0.6]} color="#e11d48" />
          </group>
        );
      })}
      <Box position={[shop.x, 2, shop.z]} size={[shop.sx, 4, shop.sz]} color="#f8fafc" />
      <Windows x={shop.x} z={shop.z} sx={shop.sx} sz={shop.sz} y={2} h={1.6} />
      <Label title="ปั๊มน้ำมัน" subtitle="Gas station" position={[canopy.x, 9, canopy.z]} scale={5} accent="#f87171" />
    </group>
  );
}

/** Town park in the middle of the residential district: lawn, paths and trees. */
function Park() {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number }[] = [];
    for (let x = -100; x <= 100; x += 14) {
      for (let z = -215; z <= -115; z += 14) {
        if (Math.abs(x) < 10 || Math.abs(z + 165) < 8) continue; // keep the paths clear
        if (Math.random() < 0.55) out.push({ x: x + (Math.random() - 0.5) * 6, z: z + (Math.random() - 0.5) * 6, s: 0.8 + Math.random() * 0.5 });
      }
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const o = new Object3D();
    const c = new Color();
    trees.forEach((t, i) => {
      o.position.set(t.x, 1.2 * t.s, t.z);
      o.scale.setScalar(t.s);
      o.updateMatrix();
      trunks.current!.setMatrixAt(i, o.matrix);
      o.position.y = 3.6 * t.s;
      o.updateMatrix();
      crowns.current!.setMatrixAt(i, o.matrix);
      crowns.current!.setColorAt(i, c.set(THEME.tree[i % THEME.tree.length]));
    });
    trunks.current!.instanceMatrix.needsUpdate = true;
    crowns.current!.instanceMatrix.needsUpdate = true;
    crowns.current!.instanceColor!.needsUpdate = true;
  }, [trees]);
  return (
    <group>
      <GroundRect minX={-112} maxX={112} minZ={-226} maxZ={-104} color="#4f8a5e" y={-0.02} />
      <GroundStrip a={{ x: 0, z: -226 }} b={{ x: 0, z: -104 }} width={3} color={THEME.walkway} y={0.01} />
      <GroundStrip a={{ x: -112, z: -165 }} b={{ x: 112, z: -165 }} width={3} color={THEME.walkway} y={0.01} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -165]}>
        <circleGeometry args={[9, 32]} />
        <meshStandardMaterial color="#3b6fb6" roughness={0.2} metalness={0.3} />
      </mesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.2, 0.28, 2.4, 6]} />
        <meshStandardMaterial color={THEME.trunk} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, trees.length]} castShadow>
        <icosahedronGeometry args={[2, 0]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
      <Label title="สวนสาธารณะ" subtitle="Town park" position={[0, 6, -150]} scale={6} accent="#86efac" />
    </group>
  );
}

export function CityBuildings() {
  return (
    <group>
      {HOMES.map((f) => (f.kind === 'house' ? <House key={f.id} f={f} /> : <Apartment key={f.id} f={f} />))}
      {STORES.map((f) => (
        <Store key={f.id} f={f} />
      ))}
      {SUPPLIERS.map((f) => (
        <Supplier key={f.id} f={f} />
      ))}
      <GasStation />
      <Park />
    </group>
  );
}
