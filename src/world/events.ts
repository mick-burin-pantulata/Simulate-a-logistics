import type { EventKind, World } from './types';

const MAX_EVENTS = 80;

export function pushEvent(w: World, kind: EventKind, text: string) {
  w.events.unshift({ id: w.nextEventId++, t: w.time, kind, text });
  if (w.events.length > MAX_EVENTS) w.events.pop();
}
