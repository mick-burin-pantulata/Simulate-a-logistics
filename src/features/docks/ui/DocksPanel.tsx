import { useSimStore } from '../../../store/useSimStore';
import { Badge, Meter, Section } from '../../../ui/components';

export function DocksPanel() {
  const docks = useSimStore((s) => s.snapshot.docks);

  return (
    <>
      {(['receiving', 'shipping'] as const).map((kind) => (
        <Section key={kind} title={kind === 'receiving' ? 'ท่ารับสินค้าเข้า (Inbound)' : 'ท่าส่งสินค้าออก (Outbound)'}>
          <div className="dock-grid">
            {docks
              .filter((d) => d.kind === kind)
              .map((d) => (
                <div key={d.id} className="dock-card">
                  <header>
                    <b>{d.name}</b>
                    <Badge
                      label={d.truck ? (d.door > 0.9 ? 'กำลังทำงาน' : 'มีรถ') : 'ว่าง'}
                      color={d.truck ? (d.door > 0.9 ? '#4ade80' : '#facc15') : '#94a3b8'}
                    />
                  </header>
                  <dl>
                    <div>
                      <dt>รถบรรทุก</dt>
                      <dd>{d.truck ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>ประตู</dt>
                      <dd>{d.door > 0.95 ? 'เปิด' : d.door < 0.05 ? 'ปิด' : 'กำลังเลื่อน'}</dd>
                    </div>
                    <div>
                      <dt>พนักงาน</dt>
                      <dd>{d.worker}</dd>
                    </div>
                  </dl>
                  <div className="meter-row">
                    <span className="muted">ช่องพักสินค้า</span>
                    <span>
                      {d.staged}/{d.slots}
                    </span>
                  </div>
                  <Meter value={d.staged} max={d.slots} color={kind === 'receiving' ? '#38bdf8' : '#4ade80'} />
                </div>
              ))}
          </div>
        </Section>
      ))}
      <p className="hint">
        ขาเข้า: พนักงานขนพาเลทจากรถ → ช่องพัก → AGV นำเข้าชั้นวาง
        <br />
        ขาออก: AGV หยิบจากชั้นวาง → ช่องพัก → พนักงานโหลดขึ้นรถ
      </p>
    </>
  );
}
