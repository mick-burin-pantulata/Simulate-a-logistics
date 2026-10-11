import { Box } from '../../../shared/primitives';
import { rectCenter, rectSize, ZONES, type Rect } from '../layout';

const GLASS = '#f6e7c4';

function WindowBands({ rect, floors, h }: { rect: Rect; floors: number; h: number }) {
  const { x, z } = rectCenter(rect);
  const { w, d } = rectSize(rect);
  const floorH = h / floors;
  return (
    <>
      {Array.from({ length: floors }, (_, f) => {
        const y = floorH * f + floorH * 0.55;
        return (
          <group key={f}>
            <Box position={[x, y, rect.maxZ + 0.02]} size={[w - 1, floorH * 0.45, 0.06]} color={GLASS} emissive="#f3d9a0" emissiveIntensity={0.55} shadow={false} roughness={0.1} />
            <Box position={[x, y, rect.minZ - 0.02]} size={[w - 1, floorH * 0.45, 0.06]} color={GLASS} emissive="#f3d9a0" emissiveIntensity={0.55} shadow={false} roughness={0.1} />
            <Box position={[rect.maxX + 0.02, y, z]} size={[0.06, floorH * 0.45, d - 1]} color={GLASS} emissive="#f3d9a0" emissiveIntensity={0.55} shadow={false} roughness={0.1} />
            <Box position={[rect.minX - 0.02, y, z]} size={[0.06, floorH * 0.45, d - 1]} color={GLASS} emissive="#f3d9a0" emissiveIntensity={0.55} shadow={false} roughness={0.1} />
          </group>
        );
      })}
    </>
  );
}

function Office() {
  const r = ZONES.office;
  const { x, z } = rectCenter(r);
  const { w, d } = rectSize(r);
  const h = 9;
  return (
    <group>
      <Box position={[x, h / 2, z]} size={[w, h, d]} color="#34407a" />
      <Box position={[x, h + 0.25, z]} size={[w + 0.6, 0.5, d + 0.6]} color="#e9ecfb" />
      <WindowBands rect={r} floors={3} h={h} />
      {/* Entrance canopy facing the walkway */}
      <Box position={[r.maxX + 1.5, 3, 2]} size={[3, 0.3, 6]} color="#4c6ef5" />
      <Box position={[r.maxX + 2.8, 1.5, -0.6]} size={[0.2, 3, 0.2]} color="#334155" />
      <Box position={[r.maxX + 2.8, 1.5, 4.6]} size={[0.2, 3, 0.2]} color="#334155" />
      {/* Rooftop units */}
      <Box position={[x - 5, h + 1.2, z - 4]} size={[4, 1.6, 3]} color="#8d97c7" />
      <Box position={[x + 4, h + 1, z + 3]} size={[3, 1.2, 3]} color="#8d97c7" />
    </group>
  );
}

function Canteen() {
  const r = ZONES.canteen;
  const { x, z } = rectCenter(r);
  const { w, d } = rectSize(r);
  return (
    <group>
      <Box position={[x, 2.5, z]} size={[w, 5, d]} color="#3b4784" />
      <Box position={[x, 5.2, z]} size={[w + 1.5, 0.4, d + 1.5]} color="#e9ecfb" />
      <WindowBands rect={r} floors={1} h={5} />
      {/* Outdoor tables */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[r.maxX + 3, 0, r.minZ + 5 + i * 5]}>
          <Box position={[0, 0.75, 0]} size={[1.6, 0.08, 1]} color="#78350f" />
          <Box position={[0, 0.37, 0]} size={[0.1, 0.74, 0.1]} color="#44403c" />
          <mesh position={[0, 2.4, 0]} castShadow>
            <coneGeometry args={[1.5, 0.8, 8]} />
            <meshStandardMaterial color={['#dc2626', '#2563eb', '#16a34a'][i]} />
          </mesh>
          <Box position={[0, 1.2, 0]} size={[0.06, 2.2, 0.06]} color="#e5e7eb" />
        </group>
      ))}
    </group>
  );
}

function Utility() {
  const r = ZONES.utility;
  return (
    <group>
      <Box position={[r.minX + 7, 3, r.minZ + 7]} size={[12, 6, 10]} color="#4a5590" />
      <Box position={[r.minX + 7, 6.2, r.minZ + 7]} size={[12.4, 0.4, 10.4]} color="#e9ecfb" />
      {[0, 1].map((i) => (
        <group key={i} position={[r.minX + 20 + i * 7, 0, r.minZ + 8]}>
          <mesh position={[0, 4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[2.6, 2.6, 8, 24]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 8.2, 0]} castShadow>
            <sphereGeometry args={[2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* Transformer yard */}
      <Box position={[r.minX + 8, 1.2, r.maxZ - 5]} size={[3, 2.4, 2]} color="#64748b" metalness={0.4} />
      <Box position={[r.minX + 13, 1.2, r.maxZ - 5]} size={[3, 2.4, 2]} color="#64748b" metalness={0.4} />
      {/* Solar panels */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[r.maxX - 8, 1.2, r.maxZ - 4 - i * 3]} rotation-x={-0.5} castShadow>
          <boxGeometry args={[10, 0.08, 2]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.7} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function Buildings() {
  return (
    <group>
      <Office />
      <Canteen />
      <Utility />
    </group>
  );
}
