import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { brandTexture } from '../../../shared/canvasTexture';
import { headlightMaterial } from '../../../shared/nightMaterials';
import { selectable } from '../../../shared/pointer';
import { useSimStore } from '../../../store/useSimStore';
import { AXLE_TO_REAR, CAB_FRONT, HITCH_TO_AXLE, TRAILER_FRONT } from '../routes';

const TRAILER_LEN = HITCH_TO_AXLE + AXLE_TO_REAR + TRAILER_FRONT;
const TRAILER_MID = (HITCH_TO_AXLE + TRAILER_FRONT - AXLE_TO_REAR) / 2;
const TRAILER_W = 2.55;
const TRAILER_H = 2.9;
const FLOOR_Y = 1.25;
const MAX_LOAD = 12;

const WHITE = '#eef1fb';
const NAVY = '#1f2a5c';
const GLASS = '#151b3d';
const TIRE = '#14172b';

function Wheel({ x, z, r = 0.55 }: { x: number; z: number; r?: number }) {
  return (
    <group position={[x, r, z]} rotation-z={Math.PI / 2}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, 0.42, 18]} />
        <meshStandardMaterial color={TIRE} roughness={0.9} />
      </mesh>
      <mesh position={[0, Math.sign(x) * 0.215, 0]}>
        <cylinderGeometry args={[r * 0.55, r * 0.55, 0.02, 16]} />
        <meshStandardMaterial color="#9aa3c7" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Cab-over tractor unit. Origin at the fifth-wheel hitch, forward +z. */
function Tractor({ color }: { color: string }) {
  const cabZ = CAB_FRONT - 1.1;
  return (
    <group>
      {/* Chassis rails and fifth wheel */}
      <mesh position={[0, 0.78, 0.9]} castShadow>
        <boxGeometry args={[1.1, 0.32, 5]} />
        <meshStandardMaterial color="#232845" />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.1, 20]} />
        <meshStandardMaterial color="#3a405f" metalness={0.5} />
      </mesh>
      {/* Cab */}
      <mesh position={[0, 2.35, cabZ]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 2.7, 2.2]} />
        <meshStandardMaterial color={WHITE} roughness={0.45} />
      </mesh>
      {/* Lower cab skirt + bumper in brand colour */}
      <mesh position={[0, 1.15, cabZ]} castShadow>
        <boxGeometry args={[2.52, 0.5, 2.22]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.9, CAB_FRONT + 0.05]} castShadow>
        <boxGeometry args={[2.5, 0.42, 0.3]} />
        <meshStandardMaterial color={NAVY} />
      </mesh>
      {/* Windshield and side windows */}
      <mesh position={[0, 2.95, CAB_FRONT + 0.01]}>
        <boxGeometry args={[2.2, 1.05, 0.04]} />
        <meshStandardMaterial color={GLASS} metalness={0.7} roughness={0.15} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.26, 2.95, cabZ + 0.45]}>
          <boxGeometry args={[0.03, 0.9, 1]} />
          <meshStandardMaterial color={GLASS} metalness={0.7} roughness={0.15} />
        </mesh>
      ))}
      {/* Grille and lamps */}
      <mesh position={[0, 1.75, CAB_FRONT + 0.01]}>
        <boxGeometry args={[1.3, 0.55, 0.04]} />
        <meshStandardMaterial color="#2b3157" />
      </mesh>
      {[-0.86, 0.86].map((x) => (
        <mesh key={x} position={[x, 1.42, CAB_FRONT + 0.03]}>
          <boxGeometry args={[0.5, 0.22, 0.04]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff4d6" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      ))}
      {/* Roof deflector */}
      <mesh position={[0, 3.95, cabZ - 0.2]} rotation-x={-0.28} castShadow>
        <boxGeometry args={[2.4, 0.5, 1.7]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Mirrors */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.45, 2.7, CAB_FRONT - 0.2]}>
          <mesh position={[-s * 0.1, 0, 0]}>
            <boxGeometry args={[0.25, 0.05, 0.05]} />
            <meshStandardMaterial color={NAVY} />
          </mesh>
          <mesh position={[s * 0.05, 0, 0]}>
            <boxGeometry args={[0.08, 0.55, 0.22]} />
            <meshStandardMaterial color={NAVY} />
          </mesh>
        </group>
      ))}
      {/* Fuel tank and steps */}
      <mesh position={[1.05, 0.85, 0.8]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.3, 0.3, 1.3, 14]} />
        <meshStandardMaterial color="#b9c0de" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Headlight beam on the ground (visible at night) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.07, CAB_FRONT + 6]} scale={[1, 1.8, 1]} material={headlightMaterial} renderOrder={1}>
        <planeGeometry args={[6, 6]} />
      </mesh>
      <Wheel x={-1.05} z={CAB_FRONT - 1} />
      <Wheel x={1.05} z={CAB_FRONT - 1} />
      <Wheel x={-1.05} z={-0.4} />
      <Wheel x={1.05} z={-0.4} />
    </group>
  );
}

function Truck({ id }: { id: number }) {
  const cab = useRef<Group>(null);
  const trailer = useRef<Group>(null);
  const doorL = useRef<Group>(null);
  const doorR = useRef<Group>(null);
  const load = useRef<(Group | null)[]>([]);
  const reverseLight = useRef<Group>(null);
  const handlers = useMemo(() => selectable('truck', id), [id]);
  const color = useSimStore((s) => s.snapshot.trucks.find((t) => t.id === id)?.color ?? '#2f55d4');
  const brand = useSimStore((s) => s.snapshot.trucks.find((t) => t.id === id)?.brand ?? '');
  const logo = useMemo(() => (brand ? brandTexture(brand, color) : null), [brand, color]);

  useFrame(() => {
    const world = useSimStore.getState().world;
    const t = world.trucks.find((x) => x.id === id);
    if (!t) return;
    cab.current!.position.set(t.cab.x, 0, t.cab.z);
    cab.current!.rotation.y = t.cab.heading;
    trailer.current!.position.set(t.trailer.x, 0, t.trailer.z);
    trailer.current!.rotation.y = t.trailer.heading;
    const open = t.phase === 'docked' && t.dockId !== null ? world.docks[t.dockId].door : 0;
    doorL.current!.rotation.y = open * 1.6;
    doorR.current!.rotation.y = -open * 1.6;
    load.current.forEach((g, i) => g && (g.visible = i < t.cargo));
    reverseLight.current!.visible = t.dir === -1 && t.speed > 0.05;
  });

  return (
    <group {...handlers}>
      <group ref={cab}>
        <Tractor color={color} />
      </group>

      {/* Semi-trailer; origin at the rear axle, forward +z */}
      <group ref={trailer}>
        <mesh position={[0, FLOOR_Y + TRAILER_H / 2, TRAILER_MID]} castShadow receiveShadow>
          <boxGeometry args={[TRAILER_W, TRAILER_H, TRAILER_LEN]} />
          <meshStandardMaterial color="#e6e9f6" roughness={0.55} />
        </mesh>
        {/* Roof rails and bottom rail */}
        <mesh position={[0, FLOOR_Y + TRAILER_H + 0.03, TRAILER_MID]}>
          <boxGeometry args={[TRAILER_W + 0.04, 0.08, TRAILER_LEN + 0.04]} />
          <meshStandardMaterial color="#c3c9e6" />
        </mesh>
        <mesh position={[0, FLOOR_Y + 0.08, TRAILER_MID]}>
          <boxGeometry args={[TRAILER_W + 0.04, 0.22, TRAILER_LEN + 0.04]} />
          <meshStandardMaterial color={NAVY} />
        </mesh>
        {/* Side branding */}
        {logo &&
          [-1, 1].map((side) => (
            <mesh
              key={side}
              position={[(side * (TRAILER_W + 0.03)) / 2, FLOOR_Y + 1.35, TRAILER_MID]}
              rotation-y={(side * Math.PI) / 2}
            >
              <planeGeometry args={[TRAILER_LEN - 1, (TRAILER_LEN - 1) / 4]} />
              <meshBasicMaterial map={logo} transparent toneMapped={false} />
            </mesh>
          ))}
        {/* Rear doors hinge at the sides */}
        <group ref={doorL} position={[-TRAILER_W / 2, 0, -AXLE_TO_REAR]}>
          <mesh position={[TRAILER_W / 4, FLOOR_Y + TRAILER_H / 2, -0.03]}>
            <boxGeometry args={[TRAILER_W / 2, TRAILER_H, 0.05]} />
            <meshStandardMaterial color="#d3d8ee" />
          </mesh>
        </group>
        <group ref={doorR} position={[TRAILER_W / 2, 0, -AXLE_TO_REAR]}>
          <mesh position={[-TRAILER_W / 4, FLOOR_Y + TRAILER_H / 2, -0.03]}>
            <boxGeometry args={[TRAILER_W / 2, TRAILER_H, 0.05]} />
            <meshStandardMaterial color="#d3d8ee" />
          </mesh>
        </group>
        {/* Underride bar */}
        <mesh position={[0, 0.75, -AXLE_TO_REAR + 0.1]}>
          <boxGeometry args={[TRAILER_W - 0.2, 0.15, 0.15]} />
          <meshStandardMaterial color="#2b3157" />
        </mesh>
        {/* Pallets inside (visible through open doors) */}
        {Array.from({ length: MAX_LOAD }, (_, i) => (
          <group
            key={i}
            ref={(g) => void (load.current[i] = g)}
            position={[i % 2 ? 0.6 : -0.6, FLOOR_Y, -AXLE_TO_REAR + 0.8 + Math.floor(i / 2) * 1.2]}
          >
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[1, 0.85, 1]} />
              <meshStandardMaterial color="#8a5a2b" />
            </mesh>
          </group>
        ))}
        <group ref={reverseLight} visible={false}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.95, FLOOR_Y - 0.15, -AXLE_TO_REAR - 0.05]}>
              <boxGeometry args={[0.3, 0.2, 0.05]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} toneMapped={false} />
            </mesh>
          ))}
        </group>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.95, FLOOR_Y + 0.15, -AXLE_TO_REAR - 0.05]}>
            <boxGeometry args={[0.32, 0.16, 0.05]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} toneMapped={false} />
          </mesh>
        ))}
        {/* Landing gear */}
        {[-0.8, 0.8].map((x) => (
          <mesh key={x} position={[x, 0.65, HITCH_TO_AXLE - 1.6]}>
            <boxGeometry args={[0.12, 1.2, 0.12]} />
            <meshStandardMaterial color="#2b3157" />
          </mesh>
        ))}
        <Wheel x={-1.05} z={0} />
        <Wheel x={1.05} z={0} />
        <Wheel x={-1.05} z={1.2} />
        <Wheel x={1.05} z={1.2} />
      </group>
    </group>
  );
}

export function Trucks() {
  const ids = useSimStore((s) => s.truckIds);
  return (
    <>
      {ids.map((id) => (
        <Truck key={id} id={id} />
      ))}
    </>
  );
}
