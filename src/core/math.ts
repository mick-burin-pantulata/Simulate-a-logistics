export interface V2 {
  x: number;
  z: number;
}

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z);

/** Heading (rotation.y) for a model whose forward axis is +z. */
export const headingTo = (from: V2, to: V2) => Math.atan2(to.x - from.x, to.z - from.z);
export const forward = (heading: number): V2 => ({ x: Math.sin(heading), z: Math.cos(heading) });

export function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Move a value toward a target by at most `step`. */
export function approach(value: number, target: number, step: number) {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
}

/** Move `pos` toward `target` by at most `step`; returns true on arrival. */
export function stepToward(pos: V2, target: V2, step: number): boolean {
  const d = dist(pos, target);
  if (d <= step) {
    pos.x = target.x;
    pos.z = target.z;
    return true;
  }
  pos.x += ((target.x - pos.x) / d) * step;
  pos.z += ((target.z - pos.z) / d) * step;
  return false;
}
