import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, Group, MeshStandardMaterial } from 'three';
import { selectable } from '../../../shared/pointer';
import { useSimStore } from '../../../store/useSimStore';
import type { AgvState } from '../agv';
import { AGV_STATE } from '../labels';

const SCALE = 1.2;
const YELLOW = '#e3b324';
const DARK = '#1b1f36';
const STEEL = '#3a4064';

function Wheel({ x, z, r }: { x: number; z: number; r: number }) {
  return (
    <mesh position={[x, r, z]} rotation-z={Math.PI / 2} castShadow>
      <cylinderGeometry args={[r, r, 0.2, 14]} />
      <meshStandardMaterial color={DARK} roughness={0.9} />
    </mesh>
  );
}

/** Counterbalance forklift with overhead guard; forward is +z, forks out front. */
function Agv({ id }: { id: number }) {
  const group = useRef<Group>(null);
  const carriage = useRef<Group>(null);
  const cargo = useRef<Group>(null);
  const beacon = useRef<MeshStandardMaterial>(null);
  const handlers = useMemo(() => selectable('agv', id), [id]);
  const colors = useMemo(
    () =>
      Object.fromEntries(Object.entries(AGV_STATE).map(([k, v]) => [k, new Color(v.color)])) as Record<AgvState, Color>,
    [],
  );

  useFrame(() => {
    const v = useSimStore.getState().world.agvs.find((x) => x.id === id);
    if (!v || !group.current) return;
    group.current.position.set(v.x, 0, v.z);
    group.current.rotation.y = v.heading;
    carriage.current!.position.y = v.forkY / SCALE;
    cargo.current!.visible = v.carrying;
    beacon.current!.color.copy(colors[v.state]);
    beacon.current!.emissive.copy(colors[v.state]);
  });

  return (
    <group ref={group} scale={SCALE} {...handlers}>
      {/* Body and counterweight */}
      <mesh position={[0, 0.45, -0.15]} castShadow>
        <boxGeometry args={[0.95, 0.5, 1.2]} />
        <meshStandardMaterial color={YELLOW} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.55, -0.72]} castShadow>
        <boxGeometry args={[0.95, 0.7, 0.3]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      {/* Seat */}
      <mesh position={[0, 0.85, -0.3]} castShadow>
        <boxGeometry args={[0.45, 0.2, 0.4]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <mesh position={[0, 1.05, -0.5]} castShadow>
        <boxGeometry args={[0.45, 0.4, 0.1]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      {/* Overhead guard: four posts and a slatted roof */}
      {[
        [-0.42, 0.15],
        [0.42, 0.15],
        [-0.42, -0.62],
        [0.42, -0.62],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.25, z]} castShadow>
          <boxGeometry args={[0.06, 1.15, 0.06]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
      ))}
      {[-0.55, -0.35, -0.15, 0.05].map((z) => (
        <mesh key={z} position={[0, 1.83, z + 0.04]} castShadow>
          <boxGeometry args={[0.92, 0.05, 0.08]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
      ))}
      {[-0.44, 0.44].map((x) => (
        <mesh key={x} position={[x, 1.83, -0.24]}>
          <boxGeometry args={[0.06, 0.06, 0.86]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
      ))}
      {/* Status beacon */}
      <mesh position={[0.3, 1.93, -0.55]}>
        <cylinderGeometry args={[0.07, 0.07, 0.14, 12]} />
        <meshStandardMaterial ref={beacon} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      {/* Mast */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 1.05, 0.5]} castShadow>
          <boxGeometry args={[0.08, 2.1, 0.1]} />
          <meshStandardMaterial color={STEEL} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 2.05, 0.5]}>
        <boxGeometry args={[0.68, 0.08, 0.1]} />
        <meshStandardMaterial color={STEEL} metalness={0.5} />
      </mesh>
      {/* Carriage + forks (raised with forkY) */}
      <group ref={carriage} position={[0, 0.08, 0.6]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.7, 0.45, 0.05]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0, 0.42]} castShadow>
            <boxGeometry args={[0.1, 0.05, 0.85]} />
            <meshStandardMaterial color="#9aa3c7" metalness={0.6} />
          </mesh>
        ))}
        <group ref={cargo} visible={false} position={[0, 0, 0.45]} scale={1 / SCALE}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[1, 0.14, 1]} />
            <meshStandardMaterial color="#6b4a2a" />
          </mesh>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.92, 0.75, 0.92]} />
            <meshStandardMaterial color="#8a5a2b" roughness={0.85} />
          </mesh>
        </group>
      </group>
      <Wheel x={-0.5} z={0.25} r={0.22} />
      <Wheel x={0.5} z={0.25} r={0.22} />
      <Wheel x={-0.5} z={-0.6} r={0.18} />
      <Wheel x={0.5} z={-0.6} r={0.18} />
    </group>
  );
}

export function Agvs() {
  const ids = useSimStore((s) => s.agvIds);
  return (
    <>
      {ids.map((id) => (
        <Agv key={id} id={id} />
      ))}
    </>
  );
}
