/** Shift starts at 08:00; one sim second is one real-world second. */
const SHIFT_START = 8 * 3600;

export function clock(simSeconds: number) {
  const t = Math.floor(SHIFT_START + simSeconds) % 86400;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function duration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
