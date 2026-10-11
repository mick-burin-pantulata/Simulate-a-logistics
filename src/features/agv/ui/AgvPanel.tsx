import { useSimStore } from '../../../store/useSimStore';
import { Badge, Meter, Section, Stat } from '../../../ui/components';
import { pct } from '../../../ui/format';
import { AGV_STATE } from '../labels';

export function AgvPanel() {
  const agvs = useSimStore((s) => s.snapshot.agvs);
  const kpi = useSimStore((s) => s.snapshot.kpi);
  const selected = useSimStore((s) => (s.selected?.kind === 'agv' ? s.selected.id : null));
  const focus = useSimStore((s) => s.focus);
  const idle = agvs.filter((a) => a.state === 'idle' || a.state === 'toPark').length;

  return (
    <>
      <div className="stat-grid">
        <Stat label="อัตราใช้งาน" value={pct(kpi.agvUtil)} />
        <Stat label="งานรอคิว" value={kpi.pendingTasks} />
        <Stat label="รถว่าง" value={`${idle}/${agvs.length}`} />
      </div>
      <Section title="ฝูงรถ AGV">
        <ul className="list">
          {agvs.map((a) => (
            <li key={a.id}>
              <button className={`row ${selected === a.id ? 'active' : ''}`} onClick={() => focus({ kind: 'agv', id: a.id })}>
                <span className="swatch" style={{ background: AGV_STATE[a.state].color }} />
                <span className="row-main">
                  <span className="row-title">{a.name}</span>
                  <span className="row-sub">
                    {a.task ?? 'ไม่มีงาน'} · ย้ายแล้ว {a.moved} พาเลท
                  </span>
                  <Meter value={a.util} color="#7c95ff" />
                </span>
                <span className="row-end">
                  <Badge {...AGV_STATE[a.state]} />
                  <small className="muted">ใช้งาน {pct(a.util)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
