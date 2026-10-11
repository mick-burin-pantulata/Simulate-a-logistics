import { clamp, dist, type V2 } from './math';

/** Polyline parameterised by arc length. Sampling outside [0, length] extrapolates linearly. */
export class Path {
  readonly pts: V2[];
  readonly cum: number[];
  readonly length: number;

  constructor(points: V2[]) {
    const pts: V2[] = [];
    for (const p of points) {
      const last = pts[pts.length - 1];
      if (!last || dist(last, p) > 1e-4) pts.push({ x: p.x, z: p.z });
    }
    if (pts.length === 1) pts.push({ x: pts[0].x, z: pts[0].z + 1e-3 });
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + dist(pts[i - 1], pts[i]));
    this.length = this.cum[this.cum.length - 1];
  }

  private segIndex(s: number) {
    let lo = 0;
    let hi = this.pts.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.cum[mid] <= s) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  dirAt(s: number): V2 {
    const i = this.segIndex(clamp(s, 0, this.length));
    const a = this.pts[i];
    const b = this.pts[i + 1];
    const d = dist(a, b) || 1;
    return { x: (b.x - a.x) / d, z: (b.z - a.z) / d };
  }

  at(s: number): V2 {
    if (s <= 0 || s >= this.length) {
      const base = s <= 0 ? this.pts[0] : this.pts[this.pts.length - 1];
      const over = s <= 0 ? s : s - this.length;
      const d = this.dirAt(s);
      return { x: base.x + d.x * over, z: base.z + d.z * over };
    }
    const i = this.segIndex(s);
    const t = (s - this.cum[i]) / (this.cum[i + 1] - this.cum[i]);
    const a = this.pts[i];
    const b = this.pts[i + 1];
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  }

  /** Points covering the final `len` units of the path. */
  tail(len: number): V2[] {
    const start = Math.max(0, this.length - len);
    const out = [this.at(start)];
    for (let i = 0; i < this.pts.length; i++) if (this.cum[i] > start) out.push(this.pts[i]);
    return out;
  }

  /** Points from `s` to the end (for drawing the remaining route). */
  from(s: number): V2[] {
    const out = [this.at(s)];
    for (let i = 0; i < this.pts.length; i++) if (this.cum[i] > s) out.push(this.pts[i]);
    return out;
  }
}

/** Replace interior corners with quadratic-bezier fillets of up to `radius`. */
export function roundCorners(pts: V2[], radius: number, segments = 10): V2[] {
  if (pts.length < 3) return pts;
  const out: V2[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const d1 = dist(p0, p1);
    const d2 = dist(p1, p2);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    const a = { x: p1.x + ((p0.x - p1.x) / d1) * r, z: p1.z + ((p0.z - p1.z) / d1) * r };
    const b = { x: p1.x + ((p2.x - p1.x) / d2) * r, z: p1.z + ((p2.z - p1.z) / d2) * r };
    for (let k = 0; k <= segments; k++) {
      const t = k / segments;
      const u = 1 - t;
      out.push({
        x: u * u * a.x + 2 * u * t * p1.x + t * t * b.x,
        z: u * u * a.z + 2 * u * t * p1.z + t * t * b.z,
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
