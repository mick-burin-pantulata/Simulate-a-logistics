import type { TruckPhase } from './trucks';

export const TRUCK_PHASE: Record<TruckPhase, { label: string; color: string }> = {
  arriving: { label: 'กำลังมาถึง', color: '#94a3b8' },
  gateIn: { label: 'รอตรวจเข้า', color: '#facc15' },
  toBay: { label: 'ไปลานพัก', color: '#a78bfa' },
  waiting: { label: 'รอคิว', color: '#f97316' },
  toDock: { label: 'วิ่งไปท่า', color: '#38bdf8' },
  reversing: { label: 'ถอยเข้าท่า', color: '#38bdf8' },
  docked: { label: 'เทียบท่า', color: '#4ade80' },
  toCheckout: { label: 'ไปลานตรวจปล่อย', color: '#a78bfa' },
  checkout: { label: 'ชั่งน้ำหนัก/ซีล', color: '#f472b6' },
  departing: { label: 'ไปประตูทางออก', color: '#a78bfa' },
  gateOut: { label: 'รอตรวจออก', color: '#facc15' },
  toSupplier: { label: 'ไปรับวัตถุดิบ', color: '#2dd4bf' },
  atSupplier: { label: 'ขึ้นของที่ซัพพลายเออร์', color: '#2dd4bf' },
  toStore: { label: 'ไปส่งร้านค้า', color: '#f472b6' },
  atStore: { label: 'ลงของที่ร้าน', color: '#f472b6' },
  toHighway: { label: 'กลับทางหลวง', color: '#64748b' },
};

export const TRUCK_KIND = {
  receiving: 'ขาเข้า (มาส่งของ)',
  shipping: 'ขาออก (มารับของ)',
} as const;
