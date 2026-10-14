import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type Ref } from 'react';
import type { Group } from 'three';
import { selectable } from '../../../shared/pointer';
import { useSimStore } from '../../../store/useSimStore';
import type { WorkerRole } from '../workers';

const SKIN = '#c68d5d';
const PANTS = '#232a52';

const HELMET: Partial<Record<WorkerRole, string>> = {
  dock: '#facc15',
  checker: '#f8fafc',
  production: '#f8fafc',
  guard: '#1e3a8a',
};

function Limb({ limbRef, x, y, len, w, color }: { limbRef: Ref<Group>; x: number; y: number; len: number; w: number; color: string }) {
  return (
    <group ref={limbRef} position={[x, y, 0]}>
      <mesh position={[0, -len / 2, 0]} castShadow>
        <boxGeometry args={[w, len, w]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/** Hand pallet truck with a loaded pallet, pushed in front of the worker. */
function PalletJack() {
  return (
    <group position={[0, 0, 0.55]}>
      <mesh position={[0, 0.75, -0.05]} rotation-x={-0.35}>
        <boxGeometry args={[0.06, 1.0, 0.06]} />
        <meshStandardMaterial color="#d9772b" />
      </mesh>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.08, 0.65]}>
          <boxGeometry args={[0.16, 0.08, 1.15]} />
          <meshStandardMaterial color="#d9772b" />
        </mesh>
      ))}
      <mesh position={[0, 0.2, 0.65]} castShadow>
        <boxGeometry args={[1.05, 0.13, 1.05]} />
        <meshStandardMaterial color="#6b4a2a" />
      </mesh>
      <mesh position={[0, 0.66, 0.65]} castShadow>
        <boxGeometry args={[0.95, 0.8, 0.95]} />
        <meshStandardMaterial color="#8a5a2b" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Person({ id }: { id: number }) {
  const data = useMemo(() => useSimStore.getState().world.workers.find((w) => w.id === id), [id]);
  const root = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const jack = useRef<Group>(null);
  const docs = useRef<Group>(null);
  const handlers = useMemo(() => selectable('worker', id), [id]);

  useFrame(() => {
    const w = useSimStore.getState().world.workers.find((x) => x.id === id);
    if (!root.current) return;
    if (!w || !w.visible) {
      root.current.visible = false;
      return;
    }
    root.current.visible = true;
    root.current.position.set(w.x, 0, w.z);
    root.current.rotation.y = w.heading;

    const swing = w.moving ? Math.sin(w.phase) * 0.6 : 0;
    legL.current!.rotation.x = swing;
    legR.current!.rotation.x = -swing;

    const busy =
      !w.moving &&
      ['working', 'checking', 'inspecting', 'wrapping', 'pickTruck', 'dropStage', 'pickStage', 'dropTruck'].includes(w.state);
    if (w.carry === 'pallet') {
      armL.current!.rotation.x = -0.9;
      armR.current!.rotation.x = -0.9;
    } else if (w.carry === 'docs') {
      armL.current!.rotation.x = -swing;
      armR.current!.rotation.x = busy ? -1.2 : -0.8;
    } else if (busy) {
      armL.current!.rotation.x = -0.9 + Math.sin(w.phase * 2.2) * 0.35;
      armR.current!.rotation.x = -0.9 - Math.sin(w.phase * 2.2) * 0.35;
    } else {
      armL.current!.rotation.x = -swing;
      armR.current!.rotation.x = swing;
    }
    jack.current!.visible = w.carry === 'pallet';
    docs.current!.visible = w.carry === 'docs';
  });

  if (!data) return null;
  const helmet = HELMET[data.role];
  return (
    <group ref={root} visible={false} {...handlers}>
      <Limb limbRef={legL} x={-0.12} y={0.9} len={0.88} w={0.17} color={PANTS} />
      <Limb limbRef={legR} x={0.12} y={0.9} len={0.88} w={0.17} color={PANTS} />
      <mesh position={[0, 1.22, 0]} castShadow>
        <boxGeometry args={[0.46, 0.66, 0.26]} />
        <meshStandardMaterial color={data.vest} />
      </mesh>
      {/* Reflective vest stripe */}
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[0.47, 0.06, 0.27]} />
        <meshStandardMaterial color="#e5e7eb" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      <Limb limbRef={armL} x={-0.31} y={1.5} len={0.62} w={0.13} color={data.vest} />
      <Limb limbRef={armR} x={0.31} y={1.5} len={0.62} w={0.13} color={data.vest} />
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.15, 14, 10]} />
        <meshStandardMaterial color={SKIN} />
      </mesh>
      {helmet && (
        <mesh position={[0, 1.8, 0]} castShadow>
          <sphereGeometry args={[0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={helmet} />
        </mesh>
      )}
      <group ref={jack} visible={false}>
        <PalletJack />
      </group>
      {/* Clipboard / delivery documents */}
      <group ref={docs} visible={false} position={[0.3, 1.15, 0.3]} rotation-x={-0.6}>
        <mesh>
          <boxGeometry args={[0.24, 0.32, 0.02]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      </group>
      {/* Generous invisible hit area so small figures are easy to click */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 2, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Distinct key per simulation run, so a reset remounts everyone with fresh data. */
const runKeys = new WeakMap<object, number>();
let nextRun = 0;
const runKey = (world: object) => {
  if (!runKeys.has(world)) runKeys.set(world, nextRun++);
  return runKeys.get(world)!;
};

export function Workers() {
  const ids = useSimStore((s) => s.workerIds);
  const world = useSimStore((s) => s.world);
  return (
    <group key={runKey(world)}>
      {ids.map((id) => (
        <Person key={id} id={id} />
      ))}
    </group>
  );
}
