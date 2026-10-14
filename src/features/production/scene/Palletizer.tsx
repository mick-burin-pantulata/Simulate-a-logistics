import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Box } from '../../../shared/primitives';
import { useSimStore } from '../../../store/useSimStore';
import { BELT_Y } from '../../conveyor/conveyor';
import { LINE_Z, PALLETIZER_X } from '../layout';

const MAX_H = 0.85;

/** End-of-line palletizer: cartons stack up as the line runs; turns pale once stretch-wrapped. */
function Palletizer({ line }: { line: number }) {
  const stack = useRef<Mesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const beacon = useRef<Group>(null);

  useFrame(({ clock }) => {
    const w = useSimStore.getState().world;
    const l = w.lines[line];
    const h = Math.max(0.02, l.progress * MAX_H);
    stack.current!.scale.y = h / MAX_H;
    stack.current!.position.y = BELT_Y + 0.07 + h / 2;
    const wrapping = l.operatorId !== null && w.workers.some((p) => p.id === l.operatorId && p.state === 'wrapping');
    mat.current!.color.set(wrapping ? '#c9d0f0' : '#8a5a2b');
    // Amber beacon flashes while a full pallet waits for an operator.
    // Amber flash: full pallet waiting. Slow flash: line starved of raw material.
    beacon.current!.visible = (l.ready && Math.sin(clock.elapsedTime * 8) > 0) || (l.starved && Math.sin(clock.elapsedTime * 3) > 0);
  });

  return (
    <group position={[PALLETIZER_X, 0, LINE_Z[line]]}>
      <Box position={[0, (BELT_Y - 0.05) / 2, 0]} size={[1.4, BELT_Y - 0.05, 1.4]} color="#3a4682" />
      <Box position={[0, BELT_Y + 0.02, 0]} size={[1.1, 0.12, 1.1]} color="#6b4a2a" />
      <mesh ref={stack} castShadow>
        <boxGeometry args={[1, MAX_H, 1]} />
        <meshStandardMaterial ref={mat} color="#8a5a2b" roughness={0.6} />
      </mesh>
      {/* Wrapper mast */}
      <Box position={[0.75, 1.3, -0.6]} size={[0.12, 2.6, 0.12]} color="#e3b324" />
      <group ref={beacon} visible={false}>
        <mesh position={[0.75, 2.75, -0.6]}>
          <sphereGeometry args={[0.14, 10, 8]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function Palletizers() {
  return (
    <>
      {LINE_Z.map((_, i) => (
        <Palletizer key={i} line={i} />
      ))}
    </>
  );
}
