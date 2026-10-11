import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { Box, GroundRect } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { useSimStore } from '../../../store/useSimStore';
import { ZONES, rectCenter, rectSize } from '../../site/layout';
import { LINE_MAX_X, LINE_MIN_X, LINE_Z, MACHINE_X } from '../layout';

const R = ZONES.production;
const BELT_SPEED = 1.2;
const BOX_GAP = 3.2;
const LINE_LEN = LINE_MAX_X - LINE_MIN_X;
const BOXES_PER_LINE = Math.floor(LINE_LEN / BOX_GAP);
const WALL_H = 1.4;

/** Products riding the conveyors; driven by sim time so they pause with the simulation. */
function ConveyorLoad() {
  const ref = useRef<InstancedMesh>(null);
  const d = useRef(new Object3D());

  useFrame(() => {
    const t = useSimStore.getState().world.time;
    const o = d.current;
    LINE_Z.forEach((z, line) => {
      for (let i = 0; i < BOXES_PER_LINE; i++) {
        const along = (t * BELT_SPEED + i * BOX_GAP + line * 1.3) % LINE_LEN;
        // Products grow from raw blocks into finished cartons as they pass the machines.
        const stage = MACHINE_X.filter((mx) => LINE_MIN_X + along > mx).length;
        o.position.set(LINE_MIN_X + along, 1.1, z);
        o.scale.setScalar(0.6 + stage * 0.12);
        o.updateMatrix();
        ref.current!.setMatrixAt(line * BOXES_PER_LINE + i, o.matrix);
      }
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, BOXES_PER_LINE * LINE_Z.length]} castShadow>
      <boxGeometry args={[0.6, 0.45, 0.6]} />
      <meshStandardMaterial color="#9c6a36" roughness={0.8} />
    </instancedMesh>
  );
}

function Machine({ x, z, i }: { x: number; z: number; i: number }) {
  const light = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    const t = useSimStore.getState().world.time;
    const on = Math.sin(t * 3 + i * 1.7) > 0;
    light.current!.emissiveIntensity = on ? 1.6 : 0.2;
  });
  return (
    <group position={[x, 0, z]}>
      <Box position={[0, 1.6, 0]} size={[2.6, 3.2, 2.4]} color="#e2e8f0" metalness={0.3} roughness={0.5} />
      <Box position={[0, 1.6, 1.21]} size={[1.8, 1.2, 0.04]} color="#0f172a" emissive="#0ea5e9" emissiveIntensity={0.4} shadow={false} />
      <Box position={[0, 3.35, 0]} size={[2.7, 0.3, 2.5]} color="#0369a1" />
      <mesh position={[1.1, 3.8, 0.9]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 10]} />
        <meshStandardMaterial ref={light} color="#22c55e" emissive="#22c55e" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function ProductionHall() {
  const { x: cx, z: cz } = rectCenter(R);
  const { w, d } = rectSize(R);
  return (
    <group>
      <GroundRect {...R} color={THEME.floor} y={0.006} />
      {/* Safety walkway along the operator side */}
      {LINE_Z.map((z) => (
        <GroundRect key={z} minX={R.minX + 1} maxX={R.maxX - 1} minZ={z + 1.1} maxZ={z + 2.6} color="#3f7f86" y={0.012} />
      ))}

      {/* Low walls with a door on the west side */}
      <Box position={[cx, WALL_H / 2, R.minZ]} size={[w, WALL_H, 0.3]} color={THEME.wall} />
      <Box position={[cx, WALL_H / 2, R.maxZ]} size={[w, WALL_H, 0.3]} color={THEME.wall} />
      <Box position={[R.maxX, WALL_H / 2, cz]} size={[0.3, WALL_H, d]} color={THEME.wall} />
      <Box position={[R.minX, WALL_H / 2, (R.minZ + (-36 - 1.5)) / 2]} size={[0.3, WALL_H, -36 - 1.5 - R.minZ]} color={THEME.wall} />
      <Box position={[R.minX, WALL_H / 2, (R.maxZ + (-36 + 1.5)) / 2]} size={[0.3, WALL_H, R.maxZ - (-36 + 1.5)]} color={THEME.wall} />

      {/* Steel frame */}
      {[-25, -12.5, 0, 12.5, 25].map((x) => (
        <group key={x}>
          <Box position={[x, 4, R.minZ]} size={[0.45, 8, 0.45]} color={THEME.steel} />
          <Box position={[x, 4, R.maxZ]} size={[0.45, 8, 0.45]} color={THEME.steel} />
          <Box position={[x, 8, cz]} size={[0.3, 0.5, d]} color={THEME.steel} shadow={false} />
        </group>
      ))}

      {/* Conveyor lines */}
      {LINE_Z.map((z) => (
        <group key={z}>
          <Box position={[(LINE_MIN_X + LINE_MAX_X) / 2, 0.8, z]} size={[LINE_LEN + 1, 0.15, 1.1]} color="#1f2937" />
          {Array.from({ length: Math.floor(LINE_LEN / 3) + 1 }, (_, i) => (
            <Box key={i} position={[LINE_MIN_X + i * 3, 0.4, z]} size={[0.12, 0.8, 1]} color="#64748b" />
          ))}
        </group>
      ))}
      {LINE_Z.flatMap((z, l) => MACHINE_X.map((x, i) => <Machine key={`${l}-${i}`} x={x} z={z - 0.2} i={l * 4 + i} />))}
      <ConveyorLoad />

      {/* Finished-goods pallets at the end of each line */}
      {LINE_Z.map((z) => (
        <group key={z} position={[LINE_MAX_X + 1.5, 0, z]}>
          <Box position={[0, 0.07, 0]} size={[1.1, 0.14, 1.1]} color="#a16207" />
          <Box position={[0, 0.55, 0]} size={[1, 0.8, 1]} color="#c08a4b" />
        </group>
      ))}
    </group>
  );
}
