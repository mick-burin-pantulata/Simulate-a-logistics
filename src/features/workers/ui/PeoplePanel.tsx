import { useSimStore } from '../../../store/useSimStore';
import { Section, Stat } from '../../../ui/components';
import { ROLE } from '../labels';
import type { WorkerRole } from '../workers';

const ORDER: WorkerRole[] = ['dock', 'production', 'walker', 'guard'];

export function PeoplePanel() {
  const workers = useSimStore((s) => s.snapshot.workers);
  const selected = useSimStore((s) => (s.selected?.kind === 'worker' ? s.selected.id : null));
  const focus = useSimStore((s) => s.focus);

  return (
    <>
      <div className="stat-grid four">
        {ORDER.map((role) => (
          <Stat key={role} label={ROLE[role].label} value={workers.filter((w) => w.role === role).length} tone={ROLE[role].color} />
        ))}
      </div>
      {ORDER.map((role) => (
        <Section key={role} title={ROLE[role].label}>
          <ul className="list compact">
            {workers
              .filter((w) => w.role === role)
              .map((w) => (
                <li key={w.id}>
                  <button className={`row ${selected === w.id ? 'active' : ''}`} onClick={() => focus({ kind: 'worker', id: w.id })}>
                    <span className="avatar" style={{ background: ROLE[role].color }}>
                      {w.name.slice(0, 1)}
                    </span>
                    <span className="row-main">
                      <span className="row-title">คุณ{w.name}</span>
                      <span className="row-sub">{w.activity}</span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </Section>
      ))}
    </>
  );
}
