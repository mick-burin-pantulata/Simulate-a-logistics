import { useSimStore } from '../../../store/useSimStore';
import { Meter, Section, Sparkline, Stat } from '../../../ui/components';
import { pct } from '../../../ui/format';

export function InventoryPanel() {
  const kpi = useSimStore((s) => s.snapshot.kpi);
  const history = useSimStore((s) => s.snapshot.history);

  return (
    <>
      <div className="stat-grid">
        <Stat label="สินค้าในคลัง" value={kpi.stock} unit="พาเลท" />
        <Stat label="ความจุ" value={kpi.capacity} unit="ช่อง" />
        <Stat label="พื้นที่ใช้" value={pct(kpi.occupancy)} />
      </div>
      <Section title="อัตราการใช้พื้นที่จัดเก็บ">
        <Meter value={kpi.occupancy} color={kpi.occupancy > 0.85 ? '#f87171' : kpi.occupancy < 0.15 ? '#facc15' : '#4ade80'} />
        <Sparkline series={[{ values: history.map((h) => h.occupancy), color: '#4ade80', max: 100 }]} />
        <p className="hint">
          ถ้ารถขาออกมามากกว่าขาเข้า สต็อกจะลดลงจนรถต้องรอของ — ปรับความถี่รถได้ในแท็บตั้งค่า
        </p>
      </Section>
      <Section title="งานในคลัง">
        <div className="stat-grid two">
          <Stat label="รอ AGV" value={kpi.pendingTasks} unit="งาน" />
          <Stat label="กำลังดำเนินการ" value={kpi.activeTasks} unit="งาน" />
        </div>
      </Section>
    </>
  );
}
