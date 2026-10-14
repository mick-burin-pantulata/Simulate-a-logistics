import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { MeshStandardMaterial } from 'three';
import { GroundText } from '../../../shared/GroundText';
import { Label } from '../../../shared/Label';
import { windowMaterial } from '../../../shared/nightMaterials';
import { Box, GroundStrip } from '../../../shared/primitives';
import { THEME } from '../../../shared/theme';
import { useSimStore } from '../../../store/useSimStore';
import {
  BAY_CAB_Z,
  EAST_BAY_X,
  LOUNGE,
  LOUNGE_DOOR,
  RECEIVING_OFFICE,
  WEST_BAY_ENTRY_Z,
  WEST_BAY_X,
  YARD_EXIT_LANE_Z,
  rectCenter,
  rectSize,
  type Rect,
} from '../../site/layout';

const BAY_TOP = BAY_CAB_Z - 4;

type ParkKind = 'queue' | 'checkout';

/** Status light at the head of a bay: green free, red occupied. */
function BayLight({ park, bay, x }: { park: ParkKind; bay: number; x: number }) {
  const mat = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    const w = useSimStore.getState().world;
    const busy = (park === 'queue' ? w.bays : w.checkoutBays)[bay] !== null;
    const c = busy ? '#ef4444' : '#22c55e';
    mat.current!.color.set(c);
    mat.current!.emissive.set(c);
  });
  return (
    <group position={[x + 1.7, 0, BAY_TOP - 0.5]}>
      <Box position={[0, 1.3, 0]} size={[0.15, 2.6, 0.15]} color={THEME.steel} />
      <mesh position={[0, 2.7, 0]}>
        <sphereGeometry args={[0.2, 12, 8]} />
        <meshStandardMaterial ref={mat} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Park({ kind, xs, bottom }: { kind: ParkKind; xs: number[]; bottom: number }) {
  const prefix = kind === 'queue' ? 'P' : 'C';
  const lines = [...xs.map((x) => x - 2), Math.max(...xs) + 2];
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  return (
    <group>
      {lines.map((x) => (
        <GroundStrip key={x} a={{ x, z: BAY_TOP }} b={{ x, z: bottom }} width={0.18} color={THEME.paintYellow} y={0.02} />
      ))}
      {xs.map((x, i) => (
        <group key={x}>
          <GroundText text={`${prefix}${i + 1}`} x={x} z={bottom - 2.2} size={1.5} angle={-Math.PI / 2} color={THEME.paintWhite} />
          <BayLight park={kind} bay={i} x={x} />
          {kind === 'checkout' && (
            // Weighbridge deck under the trailer axles
            <group>
              <Box position={[x, 0.04, BAY_CAB_Z + 7]} size={[3.2, 0.08, 14]} color="#5b6699" shadow={false} />
              {[-1.6, 1.6].map((o) => (
                <Box key={o} position={[x + o, 0.07, BAY_CAB_Z + 7]} size={[0.12, 0.1, 14]} color={THEME.paintYellow} shadow={false} />
              ))}
            </group>
          )}
        </group>
      ))}
      <GroundText text={kind === 'queue' ? 'Waiting area' : 'Weighbridge · Seal check'} x={cx} z={bottom + 1.6} size={1.1} />
      <Label
        title={kind === 'queue' ? 'ลานพักรถ (คิวเข้าท่า)' : 'ลานตรวจปล่อย'}
        subtitle={kind === 'queue' ? 'Truck queue P1–P5' : 'ชั่งน้ำหนัก · ซีลตู้ C1–C5'}
        position={[cx, 8, 26]}
        scale={6}
        accent={kind === 'queue' ? '#f97316' : '#f472b6'}
      />
    </group>
  );
}

/** Small single-storey office with a door and window facing the yard. */
function SmallOffice({ rect, door, title, subtitle, accent }: { rect: Rect; door: { x: number }; title: string; subtitle: string; accent: string }) {
  const { x, z } = rectCenter(rect);
  const { w, d } = rectSize(rect);
  return (
    <group>
      <Box position={[x, 1.7, z]} size={[w, 3.4, d]} color="#3b4784" />
      <Box position={[x, 3.55, z]} size={[w + 0.8, 0.3, d + 0.8]} color={THEME.roofTrim} />
      <Box position={[x, 2.1, rect.maxZ + 0.02]} size={[w - 1.5, 1, 0.06]} color={THEME.window} material={windowMaterial} shadow={false} />
      <Box position={[door.x, 1.1, rect.maxZ + 0.03]} size={[1.2, 2.2, 0.06]} color="#1c2350" shadow={false} />
      <Box position={[door.x, 2.45, rect.maxZ + 0.6]} size={[2.2, 0.15, 1.2]} color={THEME.accent} />
      <Label title={title} subtitle={subtitle} position={[x, 5.6, z]} scale={4.5} accent={accent} />
    </group>
  );
}

/** West queue park, east weigh-out park, and the offices either side of the dock apron. */
export function TruckPark() {
  return (
    <group>
      <Park kind="queue" xs={WEST_BAY_X} bottom={WEST_BAY_ENTRY_Z - 3} />
      <Park kind="checkout" xs={EAST_BAY_X} bottom={YARD_EXIT_LANE_Z - 3} />
      <SmallOffice rect={LOUNGE} door={LOUNGE_DOOR} title="ห้องพักคนขับ" subtitle="Driver lounge" accent="#facc15" />
      <SmallOffice
        rect={RECEIVING_OFFICE}
        door={{ x: -LOUNGE_DOOR.x }}
        title="สำนักงานรับสินค้า"
        subtitle="Receiving office"
        accent="#38bdf8"
      />
    </group>
  );
}
