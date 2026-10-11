import { forward } from '../../core/math';
import type { EntityKind } from '../../world/snapshot';
import type { World } from '../../world/types';

/** DOM elements of on-screen tags, keyed by `kind:id`; positioned every frame by TagProjector. */
export const tagElements = new Map<string, HTMLElement>();

export const tagKey = (kind: EntityKind, id: number) => `${kind}:${id}`;

/** World-space point a tag hangs from, or null if the entity no longer exists. */
export function tagAnchor(w: World, key: string): [number, number, number] | null {
  const [kind, idStr] = key.split(':');
  const id = Number(idStr);
  if (kind === 'truck') {
    const t = w.trucks.find((x) => x.id === id);
    if (!t) return null;
    const f = forward(t.trailer.heading);
    return [t.trailer.x + f.x * 4, 5.4, t.trailer.z + f.z * 4];
  }
  if (kind === 'agv') {
    const v = w.agvs.find((x) => x.id === id);
    return v ? [v.x, 3.4, v.z] : null;
  }
  const p = w.workers.find((x) => x.id === id);
  return p ? [p.x, 2.5, p.z] : null;
}
