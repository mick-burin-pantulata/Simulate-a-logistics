import type { ReactNode } from 'react';
import type { V2 } from '../core/math';

type Vec3 = [number, number, number];

interface BoxProps {
  position: Vec3;
  size: Vec3;
  color: string;
  rotationY?: number;
  shadow?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  roughness?: number;
  metalness?: number;
  children?: ReactNode;
}

export function Box({
  position,
  size,
  color,
  rotationY = 0,
  shadow = true,
  emissive,
  emissiveIntensity = 0.6,
  opacity,
  roughness = 0.8,
  metalness = 0,
}: BoxProps) {
  return (
    <mesh position={position} rotation-y={rotationY} castShadow={shadow} receiveShadow={shadow}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? emissiveIntensity : 0}
        transparent={opacity !== undefined}
        opacity={opacity ?? 1}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
}

/** Flat rectangle on the ground spanning from `a` to `b`. */
export function GroundStrip({ a, b, width, color, y = 0.01 }: { a: V2; b: V2; width: number; color: string; y?: number }) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  return (
    <mesh
      position={[(a.x + b.x) / 2, y, (a.z + b.z) / 2]}
      rotation={[-Math.PI / 2, 0, -Math.atan2(b.z - a.z, b.x - a.x)]}
      receiveShadow
    >
      <planeGeometry args={[len, width]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

/** Flat axis-aligned rectangle on the ground. */
export function GroundRect({
  minX,
  maxX,
  minZ,
  maxZ,
  color,
  y = 0,
}: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  color: string;
  y?: number;
}) {
  return (
    <mesh position={[(minX + maxX) / 2, y, (minZ + maxZ) / 2]} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[maxX - minX, maxZ - minZ]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}
