import { TRUCK_PHASE } from '../../features/trucks/labels';
import { useSimStore } from '../../store/useSimStore';
import type { EntityKind } from '../../world/snapshot';
import { tagElements, tagKey } from './registry';

function Tag({
  kind,
  id,
  title,
  chip,
  color,
  active,
}: {
  kind: EntityKind;
  id: number;
  title: string;
  chip: string;
  color: string;
  active: boolean;
}) {
  const key = tagKey(kind, id);
  return (
    <button
      ref={(el) => {
        if (el) tagElements.set(key, el);
        else tagElements.delete(key);
      }}
      className={`tag ${active ? 'active' : ''}`}
      style={{ visibility: 'hidden' }}
      onClick={() => useSimStore.getState().select({ kind, id })}
    >
      <i style={{ background: color }} />
      <b>{title}</b>
      <span>{chip}</span>
    </button>
  );
}

/** Pill labels over trucks (always) and over the selected AGV / person. */
export function EntityTags() {
  const trucks = useSimStore((s) => s.snapshot.trucks);
  const selected = useSimStore((s) => s.snapshot.selected);
  const show = useSimStore((s) => s.settings.showTags);

  return (
    <div className="tags" aria-hidden={!show}>
      {show &&
        trucks.map((t) => (
          <Tag
            key={t.id}
            kind="truck"
            id={t.id}
            title={t.plate}
            chip={TRUCK_PHASE[t.phase].label}
            color={TRUCK_PHASE[t.phase].color}
            active={selected?.kind === 'truck' && selected.id === t.id}
          />
        ))}
      {selected && selected.kind !== 'truck' && (
        <Tag
          key={`${selected.kind}-${selected.id}`}
          kind={selected.kind}
          id={selected.id}
          title={selected.title}
          chip={selected.status.label}
          color={selected.status.color}
          active
        />
      )}
    </div>
  );
}
