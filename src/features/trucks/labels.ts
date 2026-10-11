import type { TruckPhase } from './trucks';

export const TRUCK_PHASE: Record<TruckPhase, { label: string; color: string }> = {
  arriving: { label: 'กำลังมาถึง', color: '#94a3b8' },
  gateIn: { label: 'ตรวจที่ประตู', color: '#facc15' },
  toDock: { label: 'วิ่งไปท่า', color: '#38bdf8' },
  reversing: { label: 'ถอยเข้าท่า', color: '#38bdf8' },
  docked: { label: 'เทียบท่า', color: '#4ade80' },
  departing: { label: 'ออกจากท่า', color: '#a78bfa' },
  gateOut: { label: 'ออกประตู', color: '#facc15' },
  leaving: { label: 'ออกไปแล้ว', color: '#64748b' },
};

export const TRUCK_KIND = {
  receiving: 'ขาเข้า (ส่งของ)',
  shipping: 'ขาออก (รับของ)',
} as const;
