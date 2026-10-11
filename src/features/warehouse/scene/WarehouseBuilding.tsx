import { Grid } from '@react-three/drei';
import { Box, GroundRect, GroundStrip } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { ZONES } from '../../site/layout';
import { CELL, DOCKS, PARKING, cellToWorld } from '../layout';

const B = ZONES.warehouse;
const WALL_H = 1.4;
const WALL_T = 0.3;
const COLUMN_H = 8.5;
const WALL_COLOR = THEME.wall;
const STEEL = THEME.steel;
const DOOR_W = 3.6;

/** Wall along x at `z`, leaving gaps of DOOR_W at each `gaps` x. */
function WallX({ z, gaps = [] }: { z: number; gaps?: number[] }) {
  const edges = [B.minX, ...gaps.flatMap((g) => [g - DOOR_W / 2, g + DOOR_W / 2]), B.maxX];
  const pieces = [];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i];
    const b = edges[i + 1];
    pieces.push(<Box key={i} position={[(a + b) / 2, WALL_H / 2, z]} size={[b - a, WALL_H, WALL_T]} color={WALL_COLOR} />);
  }
  return <>{pieces}</>;
}

function WallZ({ x, gapZ }: { x: number; gapZ?: number }) {
  if (gapZ === undefined) {
    return <Box position={[x, WALL_H / 2, (B.minZ + B.maxZ) / 2]} size={[WALL_T, WALL_H, B.maxZ - B.minZ]} color={WALL_COLOR} />;
  }
  const a = gapZ - 1.5;
  const b = gapZ + 1.5;
  return (
    <>
      <Box position={[x, WALL_H / 2, (B.minZ + a) / 2]} size={[WALL_T, WALL_H, a - B.minZ]} color={WALL_COLOR} />
      <Box position={[x, WALL_H / 2, (b + B.maxZ) / 2]} size={[WALL_T, WALL_H, B.maxZ - b]} color={WALL_COLOR} />
    </>
  );
}

const TALL_H = 6;

/** Full-height wall with a lit clerestory window band. */
function TallWall({ from, to }: { from: { x: number; z: number }; to: { x: number; z: number } }) {
  const len = Math.hypot(to.x - from.x, to.z - from.z);
  const angle = -Math.atan2(to.z - from.z, to.x - from.x);
  return (
    <group position={[(from.x + to.x) / 2, 0, (from.z + to.z) / 2]} rotation-y={angle}>
      <Box position={[0, TALL_H / 2, 0]} size={[len, TALL_H, WALL_T]} color={WALL_COLOR} />
      <Box position={[0, TALL_H - 1.2, 0]} size={[len - 1, 0.9, WALL_T + 0.06]} color={THEME.window} emissive="#f3d9a0" emissiveIntensity={0.5} shadow={false} />
      <Box position={[0, TALL_H + 0.1, 0]} size={[len + 0.3, 0.25, WALL_T + 0.2]} color={THEME.roofTrim} />
      {Array.from({ length: Math.floor(len / 5) }, (_, i) => (
        <Box key={i} position={[-len / 2 + 2.5 + i * 5, TALL_H / 2, 0.2]} size={[0.25, TALL_H, 0.12]} color={THEME.wallLight} shadow={false} />
      ))}
    </group>
  );
}

/** Open-roof steel frame: columns plus roof trusses, so the interior stays visible. */
function Frame() {
  const xs = [-25, -15, -5, 5, 15, 25];
  return (
    <group>
      {xs.map((x) => (
        <group key={x}>
          {[B.minZ, B.maxZ].map((z) => (
            <Box key={z} position={[x, COLUMN_H / 2, z]} size={[0.5, COLUMN_H, 0.5]} color={STEEL} metalness={0.5} />
          ))}
          <Box position={[x, COLUMN_H, 0]} size={[0.3, 0.6, B.maxZ - B.minZ]} color={STEEL} metalness={0.5} shadow={false} />
        </group>
      ))}
      {[B.minZ, B.maxZ].map((z) => (
        <Box key={z} position={[0, COLUMN_H, z]} size={[B.maxX - B.minX, 0.6, 0.3]} color={STEEL} metalness={0.5} shadow={false} />
      ))}
    </group>
  );
}

export function WarehouseBuilding() {
  return (
    <group>
      <GroundRect {...B} color={THEME.floor} y={0.005} />
      <Grid
        position={[CELL / 2, 0.012, 0]}
        args={[B.maxX - B.minX, B.maxZ - B.minZ - 4]}
        cellSize={CELL}
        cellThickness={0.5}
        cellColor="#5d69a8"
        sectionSize={0}
        fadeDistance={400}
      />

      {/* Staging strip in front of the dock doors */}
      <GroundRect minX={B.minX} maxX={B.maxX} minZ={12} maxZ={B.maxZ} color={THEME.floorDark} y={0.008} />
      {DOCKS.map((d) =>
        d.stagePos.map((p, i) => (
          <group key={`${d.id}-${i}`}>
            <GroundStrip a={{ x: p.x - 0.9, z: p.z - 0.9 }} b={{ x: p.x + 0.9, z: p.z - 0.9 }} width={0.1} color={THEME.paintYellow} y={0.02} />
            <GroundStrip a={{ x: p.x - 0.9, z: p.z + 0.9 }} b={{ x: p.x + 0.9, z: p.z + 0.9 }} width={0.1} color={THEME.paintYellow} y={0.02} />
          </group>
        )),
      )}

      {/* AGV charging pads */}
      {PARKING.map((c, i) => {
        const p = cellToWorld(c);
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[p.x, 0.02, p.z]}>
            <planeGeometry args={[1.7, 1.7]} />
            <meshStandardMaterial color="#0e7490" emissive="#06b6d4" emissiveIntensity={0.3} />
          </mesh>
        );
      })}

      {/* Back (north) and east walls are full height; the camera-facing ones stay low. */}
      <TallWall from={{ x: B.minX, z: B.minZ }} to={{ x: B.maxX, z: B.minZ }} />
      <TallWall from={{ x: B.maxX, z: B.minZ }} to={{ x: B.maxX, z: B.maxZ }} />
      <WallX z={B.maxZ} gaps={DOCKS.map((d) => d.x)} />
      <WallZ x={B.minX} gapZ={0} />
      <Frame />
    </group>
  );
}
