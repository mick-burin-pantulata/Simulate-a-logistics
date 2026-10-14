import { GroundText, HazardStripe } from '../../../shared/GroundText';
import { THEME } from '../../../shared/theme';
import { LINE_MIN_X, LINE_Z } from '../../production/layout';
import { DOCKS, DOOR_Z } from '../../warehouse/layout';
import { ENTRY_GATE, EXIT_GATE, YARD_DOCK_LANE_Z, YARD_EXIT_LANE_Z, ZONES, rectCenter } from '../layout';

/** Painted floor and yard lettering, plus hazard bands at the dock doors. */
export function Markings() {
  let inN = 0;
  let outN = 0;
  return (
    <group>
      {DOCKS.map((d) => (
        <group key={d.id}>
          <GroundText
            text={d.kind === 'receiving' ? `In ${++inN}` : `Out ${++outN}`}
            x={d.x}
            z={DOOR_Z + 12.5}
            size={1.3}
            angle={-Math.PI / 2}
          />
          <HazardStripe x={d.x} z={DOOR_Z + 0.45} width={3.6} depth={0.6} />
        </group>
      ))}

      {/* Yard lanes */}
      {/* One-way traffic, west → east */}
      <GroundText text="Dock lane  ▶▶" x={-40} z={YARD_DOCK_LANE_Z + 2.2} size={1.2} />
      <GroundText text="Dock lane  ▶▶" x={40} z={YARD_DOCK_LANE_Z + 2.2} size={1.2} />
      <GroundText text="Exit lane  ▶▶" x={-10} z={YARD_EXIT_LANE_Z + 2.2} size={1.2} />
      <GroundText text="Exit lane  ▶▶" x={50} z={YARD_EXIT_LANE_Z + 2.2} size={1.2} />
      <GroundText text="ENTRY" x={ENTRY_GATE.x} z={ENTRY_GATE.z - 5} size={1.6} angle={-Math.PI / 2} color={THEME.paintWhite} />
      <GroundText text="EXIT" x={EXIT_GATE.x} z={EXIT_GATE.z - 8} size={1.6} angle={Math.PI / 2} color={THEME.paintWhite} />

      {/* Warehouse floor */}
      <GroundText text="Forklift lane" x={-14} z={10} size={1} />
      <GroundText text="Forklift lane" x={14} z={2} size={1} />
      <GroundText text="Charging" x={-11} z={-15} size={0.8} color={THEME.paintWhite} />
      <GroundText text="Staging" x={-23.5} z={12.5} size={0.7} />
      <GroundText text="Staging" x={23.5} z={12.5} size={0.7} />

      {/* Production + car park */}
      {LINE_Z.map((z, i) => (
        <GroundText key={z} text={`Line ${String.fromCharCode(65 + i)}`} x={LINE_MIN_X + 1} z={z + 3.4} size={1} />
      ))}
      {[ZONES.carParkWest, ZONES.carParkEast].map((r) => (
        <GroundText key={r.minX} text="Staff parking" x={rectCenter(r).x} z={rectCenter(r).z} size={1.5} color={THEME.paintWhite} />
      ))}
    </group>
  );
}
