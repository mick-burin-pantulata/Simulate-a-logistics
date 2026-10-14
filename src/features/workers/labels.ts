import { SHIFT_LABEL } from '../time/clock';
import type { Duty, Worker, WorkerRole } from './workers';

export const ROLE: Record<WorkerRole, { label: string; color: string }> = {
  dock: { label: 'พนักงานท่าโหลด', color: '#f97316' },
  checker: { label: 'เจ้าหน้าที่ตรวจรับ (QC)', color: '#a3e635' },
  production: { label: 'พนักงานฝ่ายผลิต', color: '#38bdf8' },
  office: { label: 'พนักงานสำนักงาน', color: '#e2e8f0' },
  guard: { label: 'รปภ.', color: '#60a5fa' },
  driver: { label: 'คนขับรถบรรทุก', color: '#facc15' },
};

export const DUTY: Record<Duty, { label: string; color: string }> = {
  home: { label: 'นอกเวลางาน', color: '#64748b' },
  commuting: { label: 'กำลังเข้างาน', color: '#facc15' },
  onDuty: { label: 'ปฏิบัติงาน', color: '#4ade80' },
  leaving: { label: 'เลิกงาน', color: '#a78bfa' },
};

const ACTIVITY: Record<string, string> = {
  idle: 'รองานที่จุดประจำ',
  toTruck: 'เข็นแฮนด์ลิฟต์ไปที่รถ',
  pickTruck: 'ลากพาเลทออกจากตู้',
  toStage: 'ลากพาเลทไปช่องพัก',
  dropStage: 'วางพาเลทที่ช่องพัก',
  pickStage: 'ยกพาเลทจากช่องพัก',
  dropTruck: 'โหลดพาเลทเข้าตู้',
  returning: 'กลับจุดประจำ',
  toPallet: 'เดินไปตรวจพาเลท',
  inspecting: 'สแกนตรวจพาเลทกับใบ ASN',
  working: 'ควบคุมเครื่องจักร',
  toPalletizer: 'ไปที่เครื่องจัดพาเลท',
  wrapping: 'พันฟิล์มพาเลท ส่งเข้าสายพาน',
  returnToStation: 'กลับประจำเครื่อง',
  atDesk: 'ทำงานในสำนักงาน',
  toBreak: 'ไปพักทานข้าว',
  onBreak: 'ทานข้าวที่โรงอาหาร',
  fromBreak: 'กลับจากพัก',
  post: 'ประจำป้อมยาม',
  checking: 'ตรวจเอกสารรถ',
  commuting: 'เดินจากลานจอดรถเข้างาน',
  leaving: 'เลิกงาน เดินไปลานจอดรถ',
  home: 'อยู่บ้าน',
  inCab: 'อยู่ในห้องโดยสาร',
  toLounge: 'ถือเอกสารไปยื่นที่สำนักงาน',
  inLounge: 'รอเอกสารในสำนักงาน',
  toCab: 'กลับขึ้นรถ',
};

export const activityOf = (w: Worker) =>
  w.role === 'guard' && w.state === 'toTruck' ? 'เดินไปตรวจรถที่ไม้กั้น' : (ACTIVITY[w.state] ?? w.state);

export const shiftLabel = (w: Worker) => SHIFT_LABEL[w.shift];
