import { create } from 'zustand';
import { addAgv, removeAgv } from '../features/agv/agv';
import { MAX_AGVS } from '../features/warehouse/layout';
import { entityPosition, makeSnapshot, type Selection, type Snapshot } from '../world/snapshot';
import type { Settings, World } from '../world/types';
import { DEFAULT_SETTINGS, createWorld, tickWorld } from '../world/world';

const INITIAL_AGVS = 9;
const MAX_STEP = 0.05;

export type CameraPreset =
  | 'city'
  | 'overview'
  | 'warehouse'
  | 'yard'
  | 'gate'
  | 'production'
  | 'homes'
  | 'shops'
  | 'suppliers';

type Vec3 = [number, number, number];

/** Isometric viewing direction (camera sits south-west and above the target). */
export const ISO_DIR: Vec3 = [-0.62, 0.72, 0.62];
/** Far enough back that the whole town stays in front of the orthographic camera's near plane. */
export const ISO_DISTANCE = 900;

export const CAMERA_PRESETS: Record<CameraPreset, { label: string; target: Vec3; zoom: number }> = {
  city: { label: 'ทั้งเมือง', target: [0, 0, 20], zoom: 1.2 },
  overview: { label: 'โรงงาน', target: [0, 0, 2], zoom: 3.2 },
  warehouse: { label: 'คลังสินค้า', target: [0, 0, 4], zoom: 11 },
  yard: { label: 'ลานรถบรรทุก', target: [0, 0, 36], zoom: 6 },
  gate: { label: 'ประตูเข้า', target: [-80, 0, 50], zoom: 13 },
  production: { label: 'ฝ่ายผลิต', target: [0, 0, -36], zoom: 12 },
  homes: { label: 'ย่านที่อยู่อาศัย', target: [0, 0, -165], zoom: 3 },
  shops: { label: 'ย่านการค้า', target: [-215, 0, 0], zoom: 3.4 },
  suppliers: { label: 'นิคมซัพพลายเออร์', target: [215, 0, 0], zoom: 3.4 },
};

export interface CameraRequest {
  seq: number;
  target: Vec3;
  zoom: number;
}

const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

interface SimStore {
  /** Mutable simulation state; read it in useFrame via getState(), never through selectors. */
  world: World;
  running: boolean;
  speed: number;
  settings: Settings;
  selected: Selection | null;
  /** Throttled, immutable view of the world for React UI. */
  snapshot: Snapshot;
  agvIds: number[];
  truckIds: number[];
  /** Ids of people (staff + drivers); changes as drivers arrive and leave. */
  workerIds: number[];
  camera: CameraRequest | null;
  /** Camera keeps the selected entity centred until the user pans or picks something else. */
  following: boolean;

  advance: (dt: number) => void;
  refresh: () => void;
  togglePlay: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setAgvCount: (count: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  select: (sel: Selection | null) => void;
  focus: (sel: Selection) => void;
  flyTo: (preset: CameraPreset) => void;
  setFollowing: (on: boolean) => void;
}

function initial(agvCount: number, settings: Settings) {
  const world = createWorld(agvCount, settings);
  return {
    world,
    selected: null,
    snapshot: makeSnapshot(world, null),
    agvIds: world.agvs.map((v) => v.id),
    truckIds: [] as number[],
    workerIds: world.workers.map((p) => p.id),
  };
}

export const useSimStore = create<SimStore>((set, get) => ({
  ...initial(INITIAL_AGVS, { ...DEFAULT_SETTINGS }),
  running: true,
  speed: 4,
  settings: { ...DEFAULT_SETTINGS },
  camera: null,
  following: false,

  advance: (dt) => {
    const { world } = get();
    for (let left = dt; left > 1e-6; left -= MAX_STEP) tickWorld(world, Math.min(left, MAX_STEP));
  },

  refresh: () => {
    const { world, selected, truckIds, workerIds } = get();
    const ids = world.trucks.map((t) => t.id);
    const people = world.workers.map((p) => p.id);
    const snapshot = makeSnapshot(world, selected);
    set({
      snapshot,
      // Drop the selection once its entity is gone (e.g. a truck that left).
      selected: snapshot.selected ? selected : null,
      ...(snapshot.selected ? {} : { following: false }),
      ...(sameIds(ids, truckIds) ? {} : { truckIds: ids }),
      ...(sameIds(people, workerIds) ? {} : { workerIds: people }),
    });
  },

  togglePlay: () => set((s) => ({ running: !s.running })),

  reset: () => {
    const { agvIds, settings } = get();
    set({ ...initial(agvIds.length, { ...settings }), following: false });
  },

  setSpeed: (speed) => set({ speed }),

  setAgvCount: (count) => {
    const { world } = get();
    const target = Math.max(1, Math.min(MAX_AGVS, count));
    while (world.agvs.length < target) addAgv(world);
    while (world.agvs.length > target) removeAgv(world);
    set({ agvIds: world.agvs.map((v) => v.id) });
    get().refresh();
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    Object.assign(get().world.settings, patch);
    set({ settings });
  },

  select: (sel) => {
    const same = sel !== null && get().selected?.kind === sel.kind && get().selected?.id === sel.id;
    set({ selected: sel, snapshot: makeSnapshot(get().world, sel), ...(same ? {} : { following: false }) });
  },

  focus: (sel) => {
    get().select(sel);
    const pos = entityPosition(get().world, sel);
    if (!pos) return;
    const zoom = sel.kind === 'worker' ? 40 : sel.kind === 'agv' ? 32 : 18;
    set((s) => ({ camera: { seq: (s.camera?.seq ?? 0) + 1, target: [pos.x, 0.5, pos.z], zoom }, following: true }));
  },

  flyTo: (preset) => {
    const p = CAMERA_PRESETS[preset];
    set((s) => ({ camera: { seq: (s.camera?.seq ?? 0) + 1, target: p.target, zoom: p.zoom }, following: false }));
  },

  setFollowing: (on) => set({ following: on && get().selected !== null }),
}));
