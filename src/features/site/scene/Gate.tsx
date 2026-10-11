import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { Box } from '../../../shared/primitives';
import { useSimStore } from '../../../store/useSimStore';
import { GATE, GUARD_HOUSE } from '../layout';

const ARM_LEN = 4.2;
const ARM_Y = 1.05;
const MAX_LIFT = Math.PI / 2.1;

function BarrierArm({ which }: { which: 'in' | 'out' }) {
  const arm = useRef<Group>(null);
  // In-lane post sits west of the lane with the arm pointing east; out-lane mirrors it.
  const sign = which === 'in' ? 1 : -1;
  const postX = which === 'in' ? GATE.minX + 1 : GATE.maxX - 1;

  useFrame(() => {
    const g = useSimStore.getState().world.gate;
    arm.current!.rotation.z = sign * MAX_LIFT * (which === 'in' ? g.inOpen : g.outOpen);
  });

  return (
    <group position={[postX, 0, GATE.z]}>
      <Box position={[0, 0.6, 0]} size={[0.5, 1.2, 0.5]} color="#e5e7eb" />
      <group ref={arm} position={[0, ARM_Y, 0]}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[sign * (ARM_LEN / 12 + (i * ARM_LEN) / 6), 0, 0]}>
            <boxGeometry args={[ARM_LEN / 6, 0.12, 0.1]} />
            <meshStandardMaterial color={i % 2 ? '#ffffff' : '#dc2626'} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Gate() {
  const { x, z, w, d } = GUARD_HOUSE;
  return (
    <group>
      {/* Guard house */}
      <Box position={[x, 1.4, z]} size={[w, 2.8, d]} color="#f1f5f9" />
      <Box position={[x, 2.95, z]} size={[w + 1, 0.3, d + 1]} color="#1e3a8a" />
      <Box position={[x - w / 2 - 0.02, 1.7, z]} size={[0.05, 1, d - 0.8]} color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.3} shadow={false} />
      {/* Gate pillars and sign beam */}
      <Box position={[GATE.minX - 0.4, 2.5, GATE.z]} size={[0.8, 5, 0.8]} color="#334155" />
      <Box position={[GATE.maxX + 0.4, 2.5, GATE.z]} size={[0.8, 5, 0.8]} color="#334155" />
      <Box position={[GATE.x, 5.4, GATE.z]} size={[GATE.maxX - GATE.minX + 1.6, 0.8, 0.5]} color="#0f766e" />
      {/* Lane island */}
      <Box position={[GATE.x, 0.1, GATE.z + 2]} size={[1.2, 0.2, 7]} color="#facc15" />
      <BarrierArm which="in" />
      <BarrierArm which="out" />
    </group>
  );
}
