import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type Ref } from 'react';
import type { Group } from 'three';
import { selectable } from '../../../shared/pointer';
import { useSimStore } from '../../../store/useSimStore';
import type { Worker as WorkerData } from '../workers';

const SKIN = '#c68d5d';
const PANTS = '#232a52';

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

function Person({ data }: { data: WorkerData }) {
  const { id, vest, role } = data;
  const root = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const box = useRef<Group>(null);
  const handlers = useMemo(() => selectable('worker', id), [id]);
  const helmet = role === 'guard' ? '#1e3a8a' : role === 'walker' ? null : role === 'dock' ? '#facc15' : '#f8fafc';

  useFrame(() => {
    const w = useSimStore.getState().world.workers.find((x) => x.id === id);
    if (!w || !root.current) return;
    root.current.position.set(w.x, 0, w.z);
    root.current.rotation.y = w.heading;

    const swing = w.moving ? Math.sin(w.phase) * 0.6 : 0;
    legL.current!.rotation.x = swing;
    legR.current!.rotation.x = -swing;

    const busy = !w.moving && (w.state === 'working' || w.state === 'checking' || w.state.startsWith('pick') || w.state.startsWith('drop'));
    if (w.carrying) {
      armL.current!.rotation.x = -1.2;
      armR.current!.rotation.x = -1.2;
    } else if (busy) {
      armL.current!.rotation.x = -0.9 + Math.sin(w.phase * 2.2) * 0.35;
      armR.current!.rotation.x = -0.9 - Math.sin(w.phase * 2.2) * 0.35;
    } else {
      armL.current!.rotation.x = -swing;
      armR.current!.rotation.x = swing;
    }
    box.current!.visible = w.carrying;
  });

  return (
    <group ref={root} {...handlers}>
      <Limb limbRef={legL} x={-0.12} y={0.9} len={0.88} w={0.17} color={PANTS} />
      <Limb limbRef={legR} x={0.12} y={0.9} len={0.88} w={0.17} color={PANTS} />
      <mesh position={[0, 1.22, 0]} castShadow>
        <boxGeometry args={[0.46, 0.66, 0.26]} />
        <meshStandardMaterial color={vest} />
      </mesh>
      {/* Reflective vest stripe */}
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[0.47, 0.06, 0.27]} />
        <meshStandardMaterial color="#e5e7eb" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      <Limb limbRef={armL} x={-0.31} y={1.5} len={0.62} w={0.13} color={vest} />
      <Limb limbRef={armR} x={0.31} y={1.5} len={0.62} w={0.13} color={vest} />
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
      <group ref={box} position={[0, 1.1, 0.42]} visible={false}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.4, 0.4]} />
          <meshStandardMaterial color="#c08a4b" />
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

export function Workers() {
  const world = useSimStore((s) => s.world);
  return (
    <>
      {world.workers.map((w) => (
        <Person key={`${w.id}-${w.role}`} data={w} />
      ))}
    </>
  );
}
