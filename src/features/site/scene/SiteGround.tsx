import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { GroundRect, GroundStrip } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { DOCKS, DOOR_Z } from '../../warehouse/layout';
import {
  EAST_PARK,
  ENTRY_GATE,
  EXIT_GATE,
  ROAD,
  SITE,
  WALK_EDGES,
  WALK_NODES,
  WEST_PARK,
  YARD,
  YARD_DOCK_LANE_Z,
  YARD_EXIT_LANE_Z,
  ZONES,
} from '../layout';

const LINE_YELLOW = THEME.paintYellow;

/** Dashed line made of instanced quads, along x (`z` given) or along z (`x` given). */
export function Dashes({ from, to, z, x, color = THEME.paintWhite }: { from: number; to: number; z?: number; x?: number; color?: string }) {
  const ref = useRef<InstancedMesh>(null);
  const count = Math.floor(Math.abs(to - from) / 4);
  useLayoutEffect(() => {
    const d = new Object3D();
    const step = to > from ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const t = from + step * (i * 4 + 1);
      d.position.set(x ?? t, 0.03, z ?? t);
      d.rotation.set(-Math.PI / 2, 0, x === undefined ? 0 : Math.PI / 2);
      d.updateMatrix();
      ref.current!.setMatrixAt(i, d.matrix);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [count, from, to, x, z]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <planeGeometry args={[2, 0.25]} />
      <meshBasicMaterial color={color} />
    </instancedMesh>
  );
}

export function SiteGround() {
  return (
    <group>
      {/* Grass under the whole town, and the factory compound pad (roads are drawn by RoadNetwork) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.06, 60]} receiveShadow>
        <planeGeometry args={[1600, 1600]} />
        <meshStandardMaterial color={THEME.grass} roughness={1} />
      </mesh>
      <GroundRect {...SITE} color={THEME.pad} y={-0.04} />

      {/* Gate aprons */}
      {[ENTRY_GATE, EXIT_GATE].map((g) => (
        <GroundRect key={g.x} minX={g.minX} maxX={g.maxX} minZ={SITE.maxZ - 1} maxZ={ROAD.minZ} color={THEME.asphalt} y={-0.025} />
      ))}

      {/* Truck yard, holding parks and their back roads */}
      <GroundRect {...YARD} color={THEME.asphalt} y={-0.02} />
      <GroundRect {...WEST_PARK} color={THEME.asphalt} y={-0.019} />
      <GroundRect {...EAST_PARK} color={THEME.asphalt} y={-0.019} />
      <Dashes from={ENTRY_GATE.x + 4} to={EXIT_GATE.x - 4} z={YARD_DOCK_LANE_Z + 2.6} color={LINE_YELLOW} />
      <Dashes from={ENTRY_GATE.x + 4} to={EXIT_GATE.x - 4} z={YARD_EXIT_LANE_Z + 3.5} color={LINE_YELLOW} />

      {/* Dock bay guide lines */}
      {DOCKS.map((d) =>
        [-1.6, 1.6].map((o) => (
          <GroundStrip key={`${d.id}${o}`} a={{ x: d.x + o, z: DOOR_Z + 0.5 }} b={{ x: d.x + o, z: DOOR_Z + 14 }} width={0.18} color={LINE_YELLOW} y={0.02} />
        )),
      )}

      {/* Building plots */}
      <GroundRect {...ZONES.production} color={THEME.floorDark} y={-0.01} />
      <GroundRect {...ZONES.utility} color={THEME.lot} y={-0.01} />
      <GroundRect {...ZONES.canteen} color={THEME.lot} y={-0.01} />

      {/* Pedestrian walkways */}
      {WALK_EDGES.map(([a, b]) => (
        <GroundStrip key={a + b} a={WALK_NODES[a]} b={WALK_NODES[b]} width={2} color={THEME.walkway} y={0.015} />
      ))}
    </group>
  );
}
