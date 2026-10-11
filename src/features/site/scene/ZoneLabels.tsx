import { Label } from '../../../shared/Label';
import { useSimStore } from '../../../store/useSimStore';
import { GATE, GUARD_HOUSE, ZONES, rectCenter } from '../layout';

const LABELS: { title: string; subtitle?: string; at: { x: number; z: number }; y: number; accent: string }[] = [
  { title: 'คลังสินค้า', subtitle: 'Warehouse', at: rectCenter(ZONES.warehouse), y: 11, accent: '#facc15' },
  { title: 'ฝ่ายผลิต', subtitle: 'Production', at: rectCenter(ZONES.production), y: 10, accent: '#38bdf8' },
  { title: 'สำนักงาน', subtitle: 'Office', at: rectCenter(ZONES.office), y: 14, accent: '#5eead4' },
  { title: 'โรงอาหาร', at: rectCenter(ZONES.canteen), y: 8, accent: '#fdba74' },
  { title: 'ลานจอดรถพนักงาน', at: rectCenter(ZONES.carPark), y: 5, accent: '#cbd5e1' },
  { title: 'อาคารสาธารณูปโภค', at: rectCenter(ZONES.utility), y: 12, accent: '#cbd5e1' },
  { title: 'ลานรถบรรทุก', subtitle: 'Truck yard', at: { x: 10, z: 52 }, y: 4, accent: '#facc15' },
  { title: 'ประตู 1', subtitle: 'ป้อมยาม', at: { x: GATE.x, z: GUARD_HOUSE.z }, y: 8, accent: '#f87171' },
];

export function ZoneLabels() {
  const show = useSimStore((s) => s.settings.showLabels);
  if (!show) return null;
  return (
    <group>
      {LABELS.map((l) => (
        <Label key={l.title} title={l.title} subtitle={l.subtitle} position={[l.at.x, l.y, l.at.z]} scale={7} accent={l.accent} />
      ))}
    </group>
  );
}
