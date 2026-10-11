import { useSimStore } from '../../../store/useSimStore';
import { Badge, Empty, Meter, Section, Stat } from '../../../ui/components';
import { duration } from '../../../ui/format';
import { TRUCK_KIND, TRUCK_PHASE } from '../labels';

export function TrucksPanel() {
  const trucks = useSimStore((s) => s.snapshot.trucks);
  const kpi = useSimStore((s) => s.snapshot.kpi);
  const selected = useSimStore((s) => (s.selected?.kind === 'truck' ? s.selected.id : null));
  const focus = useSimStore((s) => s.focus);

  return (
    <>
      <div className="stat-grid">
        <Stat label="รถในโรงงาน" value={kpi.trucksOnSite} unit="คัน" />
        <Stat label="ให้บริการแล้ว" value={kpi.trucksServed} unit="คัน" />
        <Stat label="เวลาเฉลี่ย/คัน" value={kpi.avgTurnaround ? duration(kpi.avgTurnaround) : '—'} unit="นาที" />
      </div>
      <Section title="รถบรรทุกทั้งหมด" aside={<span className="muted">{trucks.length} คัน</span>}>
        {trucks.length === 0 && <Empty>ยังไม่มีรถบรรทุก — รถคันแรกกำลังเดินทางมา</Empty>}
        <ul className="list">
          {trucks.map((t) => (
            <li key={t.id}>
              <button className={`row ${selected === t.id ? 'active' : ''}`} onClick={() => focus({ kind: 'truck', id: t.id })}>
                <span className="swatch" style={{ background: t.color }} />
                <span className="row-main">
                  <span className="row-title">
                    {t.plate} <small className="muted">· {t.dockName}</small>
                  </span>
                  <span className="row-sub">
                    {t.company} · {TRUCK_KIND[t.kind]}
                  </span>
                  <Meter value={t.cargo} max={t.capacity} color={t.kind === 'receiving' ? '#38bdf8' : '#4ade80'} />
                </span>
                <span className="row-end">
                  <Badge {...TRUCK_PHASE[t.phase]} />
                  <small className="muted">
                    {t.cargo}/{t.capacity} พาเลท{t.waiting ? ' · รอทาง' : ''}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
