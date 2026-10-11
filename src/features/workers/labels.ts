import type { Worker, WorkerRole } from './workers';

export const ROLE: Record<WorkerRole, { label: string; color: string }> = {
  dock: { label: 'พนักงานท่าโหลด', color: '#f97316' },
  production: { label: 'พนักงานฝ่ายผลิต', color: '#38bdf8' },
  walker: { label: 'พนักงานทั่วไป', color: '#a3e635' },
  guard: { label: 'รปภ.', color: '#60a5fa' },
};

const ACTIVITY: Record<string, string> = {
  idle: 'รองาน',
  toTruck: 'เดินไปที่รถบรรทุก',
  pickTruck: 'ยกพาเลทจากรถ',
  toStage: 'เดินไปช่องพักสินค้า',
  dropStage: 'วางพาเลทที่ช่องพัก',
  pickStage: 'ยกพาเลทจากช่องพัก',
  dropTruck: 'โหลดพาเลทขึ้นรถ',
  returning: 'เดินกลับจุดประจำ',
  working: 'ควบคุมเครื่องจักร',
  moving: 'ย้ายไปสถานีอื่น',
  walking: 'เดินในโรงงาน',
  pause: 'พักคุย/ทำธุระ',
  post: 'ประจำป้อมยาม',
  toCheck: 'ไปตรวจรถที่ประตู',
  checking: 'ตรวจเอกสารรถ',
};

export const activityOf = (w: Worker) => ACTIVITY[w.state] ?? w.state;
