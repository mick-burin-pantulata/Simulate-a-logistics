import { useSimStore } from '../store/useSimStore';
import { Badge, Meter } from './components';
import { Icons } from './icons';

const KIND_LABEL = { agv: 'AGV', truck: 'รถบรรทุก', worker: 'บุคลากร' } as const;

export function Inspector() {
  const item = useSimStore((s) => s.snapshot.selected);
  const select = useSimStore((s) => s.select);
  const focus = useSimStore((s) => s.focus);

  if (!item) {
    return <div className="inspector hint-card">คลิกรถบรรทุก AGV หรือพนักงานในฉากเพื่อดูรายละเอียด</div>;
  }

  return (
    <div className="inspector">
      <header>
        <div>
          <span className="eyebrow">{KIND_LABEL[item.kind]}</span>
          <h2>{item.title}</h2>
          <span className="muted">{item.subtitle}</span>
        </div>
        <div className="inspector-actions">
          <button className="icon-btn" title="ซูมไปที่" onClick={() => focus({ kind: item.kind, id: item.id })}>
            {Icons.focus}
          </button>
          <button className="icon-btn" title="ปิด" onClick={() => select(null)}>
            {Icons.close}
          </button>
        </div>
      </header>
      <Badge {...item.status} />
      <dl className="fields">
        {item.fields.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {item.progress && (
        <div className="progress">
          <div className="kv">
            <span>{item.progress.label}</span>
            <b>
              {item.progress.max === 1
                ? `${(item.progress.value * 100).toFixed(0)}%`
                : `${item.progress.value}/${item.progress.max}`}
            </b>
          </div>
          <Meter value={item.progress.value} max={item.progress.max} color={item.status.color} />
        </div>
      )}
    </div>
  );
}
