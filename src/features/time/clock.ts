/**
 * Game clock. One simulated second equals 20 game seconds, so a full day takes
 * 72 real minutes at 1× (about 2¼ minutes at 32×). Trucks, AGVs and people move
 * in real seconds; schedules, shifts and paperwork run on the game clock.
 * The simulation starts at 05:30 on day 1, so the day shift has time to drive in.
 */
export const GAME_MIN_PER_SEC = 1 / 3;
export const START_MINUTE = 5 * 60 + 30;

export type ShiftKind = 'day' | 'night' | 'office' | 'always';

export const SHIFT_HOURS: Record<Exclude<ShiftKind, 'always'>, [number, number]> = {
  day: [7, 19],
  night: [19, 7],
  office: [8, 17],
};

export const SHIFT_LABEL: Record<ShiftKind, string> = {
  day: 'กะเช้า 07–19',
  night: 'กะดึก 19–07',
  office: 'สำนักงาน 08–17',
  always: '24 ชม.',
};

export const gameMinutes = (t: number) => START_MINUTE + t * GAME_MIN_PER_SEC;
export const hourOfDay = (t: number) => (gameMinutes(t) / 60) % 24;
export const dayNumber = (t: number) => Math.floor(gameMinutes(t) / 1440) + 1;

/** Seconds of sim time for a span of game minutes. */
export const minutes = (m: number) => m / GAME_MIN_PER_SEC;

export function clockLabel(t: number) {
  const m = Math.floor(gameMinutes(t)) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Human-readable game duration for a span of sim seconds. */
export function spanLabel(sec: number) {
  const m = Math.round(sec * GAME_MIN_PER_SEC);
  if (m < 60) return `${m} นาที`;
  return `${Math.floor(m / 60)} ชม. ${m % 60} นาที`;
}

const inRange = (h: number, [a, b]: [number, number]) => (a < b ? h >= a && h < b : h >= a || h < b);

export function onShift(shift: ShiftKind, h: number) {
  return shift === 'always' || inRange(h, SHIFT_HOURS[shift]);
}

/** Which production/warehouse crew is currently on. */
export const currentShift = (h: number): 'day' | 'night' => (inRange(h, SHIFT_HOURS.day) ? 'day' : 'night');

/** Sun height: 0 at night, rising from ~05:30 to a peak of 1 at noon, setting by ~18:30. */
export function daylight(h: number) {
  const x = (h - 5.5) / 13;
  return x <= 0 || x >= 1 ? 0 : Math.sin(x * Math.PI);
}

/** Relative traffic level for each hour (inbound deliveries and outbound orders). */
export function inboundProfile(h: number) {
  if (h >= 6 && h < 18) return 1;
  if (h >= 18 && h < 22) return 0.45;
  return 0.12;
}

export function orderProfile(h: number) {
  if (h >= 8 && h < 17) return 1;
  if (h >= 17 && h < 22) return 0.35;
  return 0.08;
}
