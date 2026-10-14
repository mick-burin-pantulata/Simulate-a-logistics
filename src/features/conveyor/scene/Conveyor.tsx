import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { InstancedMesh, Matrix4, Object3D } from 'three';
import { Box } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { useSimStore } from '../../../store/useSimStore';
import { PALLETIZER_X, LINE_Z } from '../../production/layout';
import {
  BELT_Y,
  CONVEYOR_LENGTH,
  CONVEYOR_POINTS,
  CONVEYOR_X,
  LINE_BUFFER,
  RAW_CONVEYOR_POINTS,
  RAW_CONVEYOR_X,
} from '../conveyor';

const MAX_ITEMS = 24;
const START_Z = CONVEYOR_POINTS[0].z;
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

/** Pallets riding the conveyor, read from the simulation every frame. */
function Load() {
  const pallets = useRef<InstancedMesh>(null);
  const boxes = useRef<InstancedMesh>(null);
  const d = useRef(new Object3D());

  useFrame(() => {
    const items = useSimStore.getState().world.conveyor.items;
    const o = d.current;
    for (let i = 0; i < MAX_ITEMS; i++) {
      const it = items[i];
      if (!it) {
        pallets.current!.setMatrixAt(i, HIDDEN);
        boxes.current!.setMatrixAt(i, HIDDEN);
        continue;
      }
      o.position.set(CONVEYOR_X, BELT_Y + 0.07, START_Z + it.pos);
      o.updateMatrix();
      pallets.current!.setMatrixAt(i, o.matrix);
      o.position.y = BELT_Y + 0.55;
      o.updateMatrix();
      boxes.current!.setMatrixAt(i, o.matrix);
    }
    pallets.current!.instanceMatrix.needsUpdate = true;
    boxes.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={pallets} args={[undefined, undefined, MAX_ITEMS]} castShadow>
        <boxGeometry args={[1.1, 0.14, 1.1]} />
        <meshStandardMaterial color="#6b4a2a" />
      </instancedMesh>
      <instancedMesh ref={boxes} args={[undefined, undefined, MAX_ITEMS]} castShadow>
        <boxGeometry args={[1, 0.82, 1]} />
        <meshStandardMaterial color="#c9d0f0" roughness={0.35} />
      </instancedMesh>
    </group>
  );
}

/** Belt frame, rails, legs and the covered bridge between the buildings. */
function Belt({ x, z0, z1, rail }: { x: number; z0: number; z1: number; rail: string }) {
  const len = Math.abs(z1 - z0);
  const mid = (z0 + z1) / 2;
  const legs = Math.floor(len / 2.5);
  return (
    <group>
      <Box position={[x, BELT_Y - 0.08, mid]} size={[1.3, 0.16, len + 0.6]} color="#232845" />
      {[-0.68, 0.68].map((dx) => (
        <Box key={dx} position={[x + dx, BELT_Y + 0.05, mid]} size={[0.08, 0.16, len + 0.6]} color={rail} />
      ))}
      {Array.from({ length: legs + 1 }, (_, i) => (
        <Box key={i} position={[x, (BELT_Y - 0.16) / 2, Math.min(z0, z1) + i * 2.5]} size={[1.1, BELT_Y - 0.16, 0.1]} color={THEME.steel} />
      ))}
      <Box position={[x, 3, -19]} size={[2.4, 0.2, 6.4]} color={THEME.roofTrim} />
      {[-1.1, 1.1].map((dx) => (
        <Box key={dx} position={[x + dx, 1.5, -19]} size={[0.12, 3, 6.2]} color="#3a4682" />
      ))}
    </group>
  );
}

/** Raw-material pallets on the west conveyor, plus each line's feed buffer. */
function RawLoad() {
  const items = useRef<InstancedMesh>(null);
  const buffers = useRef<InstancedMesh>(null);
  const d = useRef(new Object3D());
  const startZ = RAW_CONVEYOR_POINTS[0].z;

  useFrame(() => {
    const w = useSimStore.getState().world;
    const o = d.current;
    for (let i = 0; i < MAX_ITEMS; i++) {
      const it = w.rawConveyor.items[i];
      if (!it) {
        items.current!.setMatrixAt(i, HIDDEN);
        continue;
      }
      o.position.set(RAW_CONVEYOR_X, BELT_Y + 0.5, startZ - it.pos);
      o.updateMatrix();
      items.current!.setMatrixAt(i, o.matrix);
    }
    // Feed buffers sit on the floor just east of the conveyor, beside each line's first machine.
    LINE_Z.forEach((z, line) => {
      for (let k = 0; k < LINE_BUFFER; k++) {
        const idx = line * LINE_BUFFER + k;
        if (k < w.lines[line].raw) {
          o.position.set(RAW_CONVEYOR_X + 1.6, 0.5, z + 1.2 - k * 1.25);
          o.updateMatrix();
          buffers.current!.setMatrixAt(idx, o.matrix);
        } else buffers.current!.setMatrixAt(idx, HIDDEN);
      }
    });
    items.current!.instanceMatrix.needsUpdate = true;
    buffers.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={items} args={[undefined, undefined, MAX_ITEMS]} castShadow>
        <boxGeometry args={[1, 0.9, 1]} />
        <meshStandardMaterial color="#5b7fb8" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={buffers} args={[undefined, undefined, LINE_Z.length * LINE_BUFFER]} castShadow>
        <boxGeometry args={[1, 0.9, 1]} />
        <meshStandardMaterial color="#5b7fb8" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

/**
 * Two mirrored roller conveyors between warehouse and production:
 * east = finished goods into the warehouse, west = raw material out to the lines.
 */
export function Conveyor() {
  return (
    <group>
      <Belt x={CONVEYOR_X} z0={START_Z} z1={START_Z + CONVEYOR_LENGTH} rail="#e3b324" />
      {/* Transfers from each line's palletizer onto the finished-goods conveyor */}
      {LINE_Z.map((z) => (
        <Box key={z} position={[(PALLETIZER_X + CONVEYOR_X) / 2, BELT_Y - 0.1, z]} size={[CONVEYOR_X - PALLETIZER_X, 0.14, 1.2]} color="#232845" />
      ))}
      <Load />
      <Belt x={RAW_CONVEYOR_X} z0={RAW_CONVEYOR_POINTS[1].z} z1={RAW_CONVEYOR_POINTS[0].z} rail="#5b7fb8" />
      <RawLoad />
    </group>
  );
}
