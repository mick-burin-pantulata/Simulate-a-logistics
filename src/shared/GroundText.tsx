import { useMemo } from 'react';
import { hazardTexture, textTexture } from './canvasTexture';
import { THEME } from './theme';

interface GroundTextProps {
  text: string;
  x: number;
  z: number;
  /** Letter height in metres. */
  size?: number;
  /** Rotation about the vertical axis; 0 reads west → east. */
  angle?: number;
  color?: string;
}

/** Text painted flat on the ground. */
export function GroundText({ text, x, z, size = 1.4, angle = 0, color = THEME.paintYellow }: GroundTextProps) {
  const { texture, aspect } = useMemo(() => textTexture(text, color), [text, color]);
  return (
    <group position={[x, 0.035, z]} rotation-y={angle}>
      <mesh rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={[size * aspect, size]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Yellow/black hazard band on the ground. */
export function HazardStripe({ x, z, width, depth = 0.5, angle = 0 }: { x: number; z: number; width: number; depth?: number; angle?: number }) {
  const texture = useMemo(() => {
    const t = hazardTexture().clone();
    t.repeat.set(width / (depth * 2), 1);
    t.needsUpdate = true;
    return t;
  }, [width, depth]);
  return (
    <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, angle]} renderOrder={1}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
