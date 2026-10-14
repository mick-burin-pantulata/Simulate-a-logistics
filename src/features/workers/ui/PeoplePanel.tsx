import { useSimStore } from '../../../store/useSimStore';
import { Badge, Section, Stat } from '../../../ui/components';
import { DUTY, ROLE } from '../labels';
import type { WorkerRole } from '../workers';

const ORDER: WorkerRole[] = ['dock', 'checker', 'production', 'office', 'guard', 'driver'];

export function PeoplePanel() {
  const workers = useSimStore((s) => s.snapshot.workers);
  const kpi = useSimStore((s) => s.snapshot.kpi);
  const selected = useSimStore((s) => (s.selected?.kind === 'worker' ? s.selected.id : null));
  const focus = useSimStore((s) => s.focus);
  const select = useSimStore((s) => s.select);
  const drivers = workers.filter((w) => w.role === 'driver').length;
  const commuting = workers.filter((w) => w.duty === 'commuting' || w.duty === 'leaving').length;

  return (
    <>
      <div className="stat-grid">
        <Stat label="ปฏิบัติงานอยู่" value={kpi.staffOnDuty} unit="คน" tone="#4ade80" />
        <Stat label="เข้า/ออกงาน" value={commuting} unit="คน" tone="#facc15" />
        <Stat label="คนขับในโรงงาน" value={drivers} unit="คน" tone="#f97316" />
      </div>
      <p className="hint">
        ทุกคนมีหน้าที่และกะของตัวเอง: ขับรถมาจอดที่ลานจอด → เดินเข้าจุดประจำ → พักทานข้าวที่โรงอาหารตามรอบ → เลิกงานเดินกลับ
        (กะเช้า 07–19, กะดึก 19–07, สำนักงาน 08–17)
      </p>
      {ORDER.map((role) => {
        const list = workers.filter((w) => w.role === role);
        if (!list.length) return null;
        return (
          <Section key={role} title={ROLE[role].label} aside={<span className="muted">{list.filter((w) => w.duty === 'onDuty').length}/{list.length}</span>}>
            <ul className="list compact">
              {list.map((w) => (
                <li key={w.id}>
                  <button
                    className={`row ${selected === w.id ? 'active' : ''} ${w.duty === 'home' ? 'dim' : ''}`}
                    onClick={() => (w.duty === 'home' ? select({ kind: 'worker', id: w.id }) : focus({ kind: 'worker', id: w.id }))}
                  >
                    <span className="avatar" style={{ background: ROLE[role].color }}>
                      {w.name.slice(0, 1)}
                    </span>
                    <span className="row-main">
                      <span className="row-title">
                        {role === 'driver' ? w.name : `คุณ${w.name}`} <small className="muted">· {w.shift}</small>
                      </span>
                      <span className="row-sub">{w.activity}</span>
                    </span>
                    <span className="row-end">
                      <Badge {...DUTY[w.duty]} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
    </>
  );
}
