import type { V2 } from '../../core/math';
import { ZONES } from '../site/layout';

export const LINE_Z = [-30, -42];
export const MACHINE_X = [-15, -5, 5, 15];
export const LINE_MIN_X = ZONES.production.minX + 3;
export const LINE_MAX_X = ZONES.production.maxX - 3;
/** Palletizer sits at the end of each line, next to the main conveyor. */
export const PALLETIZER_X = LINE_MAX_X + 0.9;

/** Operator positions: in front (south side) of each machine, facing the line. */
export const STATIONS: (V2 & { line: number })[] = LINE_Z.flatMap((z, line) =>
  MACHINE_X.map((x) => ({ x, z: z + 1.8, line })),
);
