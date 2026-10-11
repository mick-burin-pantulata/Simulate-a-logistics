import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { GroundRect, GroundStrip } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { DOCKS, DOOR_Z } from '../../warehouse/layout';
import { GATE, ROAD, SITE, WALK_EDGES, WALK_NODES, YARD, YARD_DOCK_LANE_Z, YARD_EXIT_LANE_Z, ZONES } from '../layout';

const ASPHALT = THEME.asphalt;
const LINE_WHITE = THEME.paintWhite;
const LINE_YELLOW = THEME.paintYellow;

/** Dashed line made of instanced quads. */
function Dashes({ from, to, z, x, color = LINE_WHITE }: { from: number; to: number; z?: number; x?: number; color?: string }) {
  const ref = useRef<InstancedMesh>(null);
  const count = Math.floor(Math.abs(to - from) / 4);
  useLayoutEffect(() => {
    const d = new Object3D();
    for (let i = 0; i < count; i++) {
      const t = from + (to > from ? 1 : -1) * (i * 4 + 1);
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
      {/* Grass and compound pad */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={THEME.grass} roughness={1} />
      </mesh>
      <GroundRect {...SITE} color={THEME.pad} y={-0.04} />

      {/* Public road */}
      <GroundRect minX={ROAD.minX} maxX={ROAD.maxX + 20} minZ={ROAD.minZ} maxZ={ROAD.maxZ} color={THEME.road} y={-0.03} />
      <GroundStrip a={{ x: ROAD.minX, z: ROAD.minZ + 0.4 }} b={{ x: ROAD.maxX + 20, z: ROAD.minZ + 0.4 }} width={0.2} color={LINE_WHITE} y={0.02} />
      <GroundStrip a={{ x: ROAD.minX, z: ROAD.maxZ - 0.4 }} b={{ x: ROAD.maxX + 20, z: ROAD.maxZ - 0.4 }} width={0.2} color={LINE_WHITE} y={0.02} />
      <Dashes from={ROAD.minX} to={ROAD.maxX + 20} z={(ROAD.minZ + ROAD.maxZ) / 2} />

      {/* Gate apron and truck yard */}
      <GroundRect minX={GATE.minX} maxX={GATE.maxX} minZ={SITE.maxZ - 1} maxZ={ROAD.minZ} color={ASPHALT} y={-0.025} />
      <GroundRect {...YARD} color={ASPHALT} y={-0.02} />
      <Dashes from={GATE.minX + 2} to={YARD.minX + 4} z={YARD_DOCK_LANE_Z + 3.5} color={LINE_YELLOW} />
      <Dashes from={YARD.minX + 4} to={GATE.maxX - 2} z={YARD_EXIT_LANE_Z + 3.5} color={LINE_YELLOW} />
      <GroundStrip a={{ x: GATE.x, z: SITE.maxZ - 6 }} b={{ x: GATE.x, z: ROAD.minZ }} width={0.25} color={LINE_YELLOW} y={0.02} />

      {/* Dock bay guide lines */}
      {DOCKS.map((d) => (
        <group key={d.id}>
          {[-1.6, 1.6].map((o) => (
            <GroundStrip key={o} a={{ x: d.x + o, z: DOOR_Z + 0.5 }} b={{ x: d.x + o, z: DOOR_Z + 14 }} width={0.18} color={LINE_YELLOW} y={0.02} />
          ))}
        </group>
      ))}

      {/* Building plots */}
      <GroundRect {...ZONES.production} color={THEME.floorDark} y={-0.01} />
      <GroundRect {...ZONES.utility} color={THEME.lot} y={-0.01} />

      {/* Pedestrian walkways */}
      {WALK_EDGES.map(([a, b]) => (
        <GroundStrip key={a + b} a={WALK_NODES[a]} b={WALK_NODES[b]} width={2} color={THEME.walkway} y={0.015} />
      ))}
    </group>
  );
}
