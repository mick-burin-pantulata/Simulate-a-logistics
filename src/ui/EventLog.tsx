import { useState } from 'react';
import { useSimStore } from '../store/useSimStore';
import type { EventKind } from '../world/types';
import { clockLabel } from '../features/time/clock';
import { Icons } from './icons';

const KIND_COLOR: Record<EventKind, string> = {
  truck: '#38bdf8',
  gate: '#f87171',
  dock: '#4ade80',
  agv: '#7c95ff',
  order: '#f472b6',
  staff: '#facc15',
  info: '#94a3b8',
};

export function EventLog() {
  const events = useSimStore((s) => s.snapshot.events);
  const [open, setOpen] = useState(true);

  return (
    <section className={`eventlog ${open ? 'open' : ''}`}>
      <button className="eventlog-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {Icons.log}
        <b>บันทึกเหตุการณ์</b>
        <span className="muted">{events.length}</span>
        <span className="chev">{Icons.chevron}</span>
      </button>
      {open && (
        <ol>
          {events.map((e) => (
            <li key={e.id}>
              <time>{clockLabel(e.t)}</time>
              <i style={{ background: KIND_COLOR[e.kind] }} />
              <span>{e.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
