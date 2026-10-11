import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Label } from '../../../shared/Label';
import { Box } from '../../../shared/primitives';
import { useSimStore } from '../../../store/useSimStore';
import { DOCKS, DOOR_Z, type DockDef } from '../../warehouse/layout';

const DOOR_W = 3.4;
const DOOR_H = 3.5;

export function Pallet({ withLoad = true }: { withLoad?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.14, 1.1]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      {withLoad && (
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 0.72, 1]} />
          <meshStandardMaterial color="#8a5a2b" roughness={0.85} />
        </mesh>
      )}
    </group>
  );
}

function Dock({ def }: { def: DockDef }) {
  const door = useRef<Mesh>(null);
  const lamp = useRef<MeshStandardMaterial>(null);
  const slots = useRef<(Group | null)[]>([]);
  const receiving = def.kind === 'receiving';

  useFrame(() => {
    const world = useSimStore.getState().world;
    const state = world.docks[def.id];
    const open = state.door;
    const s = Math.max(0.06, 1 - open);
    door.current!.scale.y = s;
    door.current!.position.y = DOOR_H - (DOOR_H * s) / 2;
    const occupied = state.truckId !== null && world.trucks.some((t) => t.id === state.truckId && t.phase === 'docked');
    lamp.current!.emissive.set(occupied ? '#ef4444' : '#22c55e');
    lamp.current!.color.set(occupied ? '#ef4444' : '#22c55e');
    state.stage.forEach((slot, i) => {
      const g = slots.current[i];
      if (g) g.visible = slot.full;
    });
  });

  return (
    <group>
      {/* Door frame + roll-up door */}
      <group position={[def.x, 0, DOOR_Z]}>
        <Box position={[-DOOR_W / 2 - 0.15, (DOOR_H + 0.4) / 2, 0]} size={[0.3, DOOR_H + 0.4, 0.4]} color="#1c2350" />
        <Box position={[DOOR_W / 2 + 0.15, (DOOR_H + 0.4) / 2, 0]} size={[0.3, DOOR_H + 0.4, 0.4]} color="#1c2350" />
        <Box position={[0, DOOR_H + 0.4, 0]} size={[DOOR_W + 0.6, 0.6, 0.5]} color="#1c2350" />
        <mesh ref={door} position={[0, DOOR_H / 2, 0]} castShadow>
          <boxGeometry args={[DOOR_W, DOOR_H, 0.12]} />
          <meshStandardMaterial color={receiving ? '#4c6ef5' : '#8d97c7'} metalness={0.3} roughness={0.6} />
        </mesh>
        {/* Bumpers and status lamp on the yard side */}
        <Box position={[-1.3, 1.0, 0.3]} size={[0.35, 0.5, 0.25]} color="#111827" />
        <Box position={[1.3, 1.0, 0.3]} size={[0.35, 0.5, 0.25]} color="#111827" />
        <mesh position={[DOOR_W / 2 + 0.6, 2.6, 0.3]}>
          <sphereGeometry args={[0.18, 12, 8]} />
          <meshStandardMaterial ref={lamp} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
        <Label
          title={def.name}
          subtitle={receiving ? 'รับสินค้าเข้า' : 'ส่งสินค้าออก'}
          position={[0, DOOR_H + 2.2, 0]}
          scale={3.6}
          accent={receiving ? '#38bdf8' : '#4ade80'}
        />
      </group>

      {/* Staging slots */}
      {def.stagePos.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} ref={(g) => void (slots.current[i] = g)} visible={false}>
          <Pallet />
        </group>
      ))}
    </group>
  );
}

export function DockArea() {
  return (
    <group>
      {DOCKS.map((d) => (
        <Dock key={d.id} def={d} />
      ))}
    </group>
  );
}
