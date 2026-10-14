import { useSimStore } from '../../../store/useSimStore';
import { Badge, Empty, Meter, Section, Stat } from '../../../ui/components';
import type { TruckRow } from '../../../world/snapshot';
import { spanLabel } from '../../time/clock';
import { TRUCK_KIND, TRUCK_PHASE } from '../labels';

const STAGES: { title: string; phases: TruckRow['phase'][] }[] = [
  { title: 'ไปรับวัตถุดิบที่ซัพพลายเออร์', phases: ['toSupplier', 'atSupplier'] },
  { title: 'กำลังมาโรงงาน', phases: ['arriving'] },
  { title: 'ที่ประตู (ตรวจเอกสาร)', phases: ['gateIn'] },
  { title: 'รอคิวที่ลานพักรถ', phases: ['toBay', 'waiting'] },
  { title: 'ที่ท่าโหลด', phases: ['toDock', 'reversing', 'docked'] },
  { title: 'ลานตรวจปล่อย (ชั่งน้ำหนัก/ซีล)', phases: ['toCheckout', 'checkout'] },
  { title: 'กำลังออกจากโรงงาน', phases: ['departing', 'gateOut'] },
  { title: 'ส่งสินค้าให้ร้านค้า', phases: ['toStore', 'atStore'] },
  { title: 'กลับทางหลวง', phases: ['toHighway'] },
];

function TruckItem({ t, active, onClick }: { t: TruckRow; active: boolean; onClick: () => void }) {
  const where = t.dockName
    ? `ท่า ${t.dockName}`
    : t.bayName
      ? `ลานพัก ${t.bayName}`
      : t.checkoutName
        ? `ลานตรวจปล่อย ${t.checkoutName}`
        : null;
  return (
    <li>
      <button className={`row ${active ? 'active' : ''}`} onClick={onClick}>
        <span className="swatch" style={{ background: t.color }} />
        <span className="row-main">
          <span className="row-title">
            {t.plate} <small className="muted">· {t.ref}</small>
          </span>
          <span className="row-sub">
            {TRUCK_KIND[t.kind]}
            {where ? ` · ${where}` : ''}
            {t.onSite !== null ? ` · ${spanLabel(t.onSite)}` : ''}
          </span>
          <Meter value={t.cargo} max={t.capacity} color={t.kind === 'receiving' ? '#38bdf8' : '#4ade80'} />
        </span>
        <span className="row-end">
          <Badge {...TRUCK_PHASE[t.phase]} />
          <small className="muted">
            {t.cargo}/{t.capacity} พาเลท
          </small>
        </span>
      </button>
    </li>
  );
}

export function TrucksPanel() {
  const trucks = useSimStore((s) => s.snapshot.trucks);
  const bays = useSimStore((s) => s.snapshot.bays);
  const checkout = useSimStore((s) => s.snapshot.checkoutBays);
  const kpi = useSimStore((s) => s.snapshot.kpi);
  const selected = useSimStore((s) => (s.selected?.kind === 'truck' ? s.selected.id : null));
  const focus = useSimStore((s) => s.focus);

  return (
    <>
      <div className="stat-grid">
        <Stat label="รอคิว" value={kpi.queue} unit="คัน" tone="#f97316" />
        <Stat label="รอคิวเฉลี่ย" value={kpi.avgQueueWait ? spanLabel(kpi.avgQueueWait) : '—'} />
        <Stat label="อยู่ในโรงงานเฉลี่ย" value={kpi.avgTurnaround ? spanLabel(kpi.avgTurnaround) : '—'} />
      </div>

      <Section title="ลานพักรถฝั่งตะวันตก (คิวเข้าท่า)">
        <div className="bay-strip">
          {bays.map((plate, i) => (
            <div key={i} className={`bay ${plate ? 'busy' : ''}`}>
              <b>P{i + 1}</b>
              <span>{plate ?? 'ว่าง'}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="ลานตรวจปล่อยฝั่งตะวันออก (ชั่ง/ซีล)">
        <div className="bay-strip">
          {checkout.map((plate, i) => (
            <div key={i} className={`bay ${plate ? 'busy out' : ''}`}>
              <b>C{i + 1}</b>
              <span>{plate ?? 'ว่าง'}</span>
            </div>
          ))}
        </div>
        <p className="hint">
          รถวิ่งทางเดียว: เข้าประตูตะวันตก → รอคิว P1–P5 → เรียกเข้าท่าแบบ FIFO → ชั่งน้ำหนัก/ซีลที่ C1–C5 → ออกประตูตะวันออก
        </p>
      </Section>

      {trucks.length === 0 && <Empty>ยังไม่มีรถบรรทุก — ดูตารางนัดในแท็บออเดอร์</Empty>}
      {STAGES.map((stage) => {
        const list = trucks.filter((t) => stage.phases.includes(t.phase));
        if (!list.length) return null;
        return (
          <Section key={stage.title} title={stage.title} aside={<span className="muted">{list.length} คัน</span>}>
            <ul className="list">
              {list.map((t) => (
                <TruckItem key={t.id} t={t} active={selected === t.id} onClick={() => focus({ kind: 'truck', id: t.id })} />
              ))}
            </ul>
          </Section>
        );
      })}
    </>
  );
}
