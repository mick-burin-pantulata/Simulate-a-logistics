import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { windowMaterial } from '../../../shared/nightMaterials';
import { Label } from '../../../shared/Label';
import { Box } from '../../../shared/primitives';
import { useSimStore } from '../../../store/useSimStore';
import { ENTRY_GATE, EXIT_GATE, GUARD_HOUSES } from '../layout';

const ARM_LEN = 7.6;
const ARM_Y = 1.05;
const MAX_LIFT = Math.PI / 2.1;

type GateKind = 'entry' | 'exit';
const GATES = { entry: ENTRY_GATE, exit: EXIT_GATE };

/** Barrier arm pivoting on the booth side of the lane. */
function BarrierArm({ kind }: { kind: GateKind }) {
  const arm = useRef<Group>(null);
  const g = GATES[kind];
  // Entry booth is east of its lane (arm points west); exit booth is west of its lane (arm points east).
  const sign = kind === 'entry' ? -1 : 1;
  const postX = kind === 'entry' ? g.maxX - 0.6 : g.minX + 0.6;

  useFrame(() => {
    const s = useSimStore.getState().world.gate;
    arm.current!.rotation.z = sign * MAX_LIFT * (kind === 'entry' ? s.inOpen : s.outOpen);
  });

  return (
    <group position={[postX, 0, g.z]}>
      <Box position={[0, 0.6, 0]} size={[0.5, 1.2, 0.5]} color="#e5e7eb" />
      <group ref={arm} position={[0, ARM_Y, 0]}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[sign * (ARM_LEN / 16 + (i * ARM_LEN) / 8), 0, 0]}>
            <boxGeometry args={[ARM_LEN / 8, 0.12, 0.1]} />
            <meshStandardMaterial color={i % 2 ? '#ffffff' : '#dc2626'} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function GatePost({ kind }: { kind: GateKind }) {
  const g = GATES[kind];
  const house = GUARD_HOUSES[kind];
  const toLane = kind === 'entry' ? -1 : 1;
  return (
    <group>
      {/* Guard house with a window facing its lane */}
      <Box position={[house.x, 1.4, house.z]} size={[house.w, 2.8, house.d]} color="#e9ecfb" />
      <Box position={[house.x, 2.95, house.z]} size={[house.w + 1, 0.3, house.d + 1]} color="#1e3a8a" />
      <Box
        position={[house.x + (toLane * house.w) / 2 + toLane * 0.02, 1.7, house.z]}
        size={[0.05, 1, house.d - 0.8]}
        color="#f6e7c4"
        material={windowMaterial}
        shadow={false}
      />
      {/* Pillars and sign beam */}
      <Box position={[g.minX - 0.4, 2.5, g.z]} size={[0.8, 5, 0.8]} color="#334155" />
      <Box position={[g.maxX + 0.4, 2.5, g.z]} size={[0.8, 5, 0.8]} color="#334155" />
      <Box position={[g.x, 5.4, g.z]} size={[g.maxX - g.minX + 1.6, 0.8, 0.5]} color={kind === 'entry' ? '#0f766e' : '#9f1239'} />
      <BarrierArm kind={kind} />
      <Label
        title={kind === 'entry' ? 'ประตูทางเข้า' : 'ประตูทางออก'}
        subtitle={kind === 'entry' ? 'ENTRY · รถบรรทุกเข้า' : 'EXIT · รถบรรทุกออก'}
        position={[g.x, 8, g.z]}
        scale={6}
        accent={kind === 'entry' ? '#4ade80' : '#f87171'}
      />
    </group>
  );
}

export function Gate() {
  return (
    <group>
      <GatePost kind="entry" />
      <GatePost kind="exit" />
    </group>
  );
}
