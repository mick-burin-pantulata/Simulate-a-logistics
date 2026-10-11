import type { AgvState } from './agv';

export const AGV_STATE: Record<AgvState, { label: string; color: string }> = {
  idle: { label: 'ว่าง', color: '#94a3b8' },
  toPickup: { label: 'ไปรับพาเลท', color: '#38bdf8' },
  loading: { label: 'กำลังยกขึ้น', color: '#facc15' },
  toDrop: { label: 'ขนส่งพาเลท', color: '#4ade80' },
  unloading: { label: 'กำลังวางลง', color: '#facc15' },
  toPark: { label: 'กลับจุดชาร์จ', color: '#a78bfa' },
};
