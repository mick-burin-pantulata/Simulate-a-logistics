import { useState } from 'react';
import { useSimStore } from '../../../store/useSimStore';
import { Badge, Empty, Meter, Section } from '../../../ui/components';
import type { ShipmentRow } from '../../../world/snapshot';

function ShipmentItem({ s }: { s: ShipmentRow }) {
  const receiving = s.kind === 'receiving';
  return (
    <li className={`shipment ${s.closed ? 'closed' : ''}`}>
      <header>
        <b>{s.ref}</b>
        <Badge {...s.status} />
      </header>
      <div className="row-sub">
        {receiving ? 'จาก' : 'ถึง'} {s.party} · รถออก {s.eta}
        {s.plate ? ` · ${s.plate}` : ''}
      </div>
      <div className="meter-row">
        <span className="muted">{receiving ? 'ขนลงแล้ว' : 'โหลดแล้ว'}</span>
        <span>
          {s.handled}/{s.pallets} พาเลท
        </span>
      </div>
      <Meter value={s.handled} max={s.pallets} color={receiving ? '#38bdf8' : '#4ade80'} />
      {receiving && s.handled > 0 && (
        <>
          <div className="meter-row">
            <span className="muted">ผ่าน QC</span>
            <span>
              {s.checked}/{s.pallets}
            </span>
          </div>
          <Meter value={s.checked} max={s.pallets} color="#a3e635" />
        </>
      )}
    </li>
  );
}

export function OrdersPanel() {
  const shipments = useSimStore((s) => s.snapshot.shipments);
  const [tab, setTab] = useState<'receiving' | 'shipping'>('receiving');
  const list = shipments.filter((s) => s.kind === tab);
  const open = list.filter((s) => !s.closed);
  const closed = list.filter((s) => s.closed);

  return (
    <>
      <div className="segmented wide" role="tablist">
        <button className={tab === 'receiving' ? 'active' : ''} onClick={() => setTab('receiving')}>
          รับเข้า (ใบสั่งซื้อ)
        </button>
        <button className={tab === 'shipping' ? 'active' : ''} onClick={() => setTab('shipping')}>
          ส่งออก (ใบสั่งจากร้าน)
        </button>
      </div>
      <p className="hint">
        {tab === 'receiving'
          ? 'วัตถุดิบต่ำกว่าจุดสั่งซื้อ → ฝ่ายจัดซื้อออกใบสั่ง → รถไปรับที่ซัพพลายเออร์ในเมือง → ตรวจที่ประตู → คิว → ขนลง → QC → AGV จัดเก็บ'
          : 'ร้านค้าในเมืองสต็อกต่ำ → ส่งใบสั่ง → รถมาโรงงาน → AGV หยิบสินค้า → โหลด → ชั่ง/ซีล → ตรวจออก → ไปส่งถึงร้าน'}
      </p>
      <Section title="กำลังดำเนินการ / นัดหมาย" aside={<span className="muted">{open.length}</span>}>
        {open.length === 0 && <Empty>ไม่มีเอกสารค้าง</Empty>}
        <ul className="list">
          {open.map((s) => (
            <ShipmentItem key={s.id} s={s} />
          ))}
        </ul>
      </Section>
      {closed.length > 0 && (
        <Section title="เสร็จสิ้นล่าสุด">
          <ul className="list">
            {closed
              .slice(-6)
              .reverse()
              .map((s) => (
                <ShipmentItem key={s.id} s={s} />
              ))}
          </ul>
        </Section>
      )}
    </>
  );
}
