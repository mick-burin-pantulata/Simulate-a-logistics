import { useSimStore } from '../../../store/useSimStore';
import { Meter, Section, Stat } from '../../../ui/components';
import { pct } from '../../../ui/format';

/** Supply chain at a glance, then each part of town. */
export function CityPanel() {
  const kpi = useSimStore((s) => s.snapshot.kpi);
  const stores = useSimStore((s) => s.snapshot.stores);
  const suppliers = useSimStore((s) => s.snapshot.suppliers);
  const town = useSimStore((s) => s.snapshot.town);
  const rawReorder = useSimStore((s) => s.settings.rawReorder);
  const flyTo = useSimStore((s) => s.flyTo);

  return (
    <>
      <Section title="ห่วงโซ่อุปทานในเมือง">
        <div className="chain">
          <button className="chain-step" onClick={() => flyTo('suppliers')}>
            <b>ซัพพลายเออร์</b>
            <span>{suppliers.reduce((n, s) => n + s.stock, 0).toFixed(0)} พาเลท</span>
          </button>
          <i>→</i>
          <button className="chain-step" onClick={() => flyTo('warehouse')}>
            <b>วัตถุดิบ</b>
            <span>{kpi.rawStock} พาเลท</span>
          </button>
          <i>→</i>
          <button className="chain-step" onClick={() => flyTo('production')}>
            <b>ผลิต</b>
            <span>{kpi.produced} พาเลท</span>
          </button>
          <i>→</i>
          <button className="chain-step" onClick={() => flyTo('warehouse')}>
            <b>สินค้าสำเร็จ</b>
            <span>{kpi.finishedStock} พาเลท</span>
          </button>
          <i>→</i>
          <button className="chain-step" onClick={() => flyTo('shops')}>
            <b>ร้านค้า</b>
            <span>{kpi.storeStock.toFixed(0)} พาเลท</span>
          </button>
        </div>
        <div className="stat-grid">
          <Stat label="ลูกค้าได้ของ" value={pct(kpi.serviceLevel)} tone="#4ade80" />
          <Stat label="วัตถุดิบ (รวมที่สั่ง)" value={kpi.rawPosition} unit={`/ จุดสั่ง ${rawReorder}`} tone="#5b7fb8" />
          <Stat label="รถบรรทุกในเมือง" value={town.trucksInTown} unit="คัน" tone="#f472b6" />
        </div>
      </Section>

      <Section title="ร้านค้า (ลูกค้าของโรงงาน)">
        <ul className="list">
          {stores.map((s) => (
            <li key={s.id} className="shipment">
              <header>
                <b>
                  <i className="dot" style={{ background: s.color }} /> {s.name}
                </b>
                <span className="muted">
                  ขายวันนี้ {s.soldToday.toFixed(1)}
                  {s.lostToday > 0 ? ` · ขาดของ ${s.lostToday.toFixed(1)}` : ''}
                </span>
              </header>
              <div className="meter-row">
                <span className="muted">สต็อกบนชั้น</span>
                <span>
                  {s.stock.toFixed(1)}/{s.capacity} พาเลท
                </span>
              </div>
              <Meter value={s.stock} max={s.capacity} color={s.stock < s.capacity * 0.2 ? '#f87171' : '#4ade80'} />
              {s.order && <div className="row-sub">ใบสั่ง {s.order}</div>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="ซัพพลายเออร์วัตถุดิบ">
        <ul className="list">
          {suppliers.map((s) => (
            <li key={s.id} className="shipment">
              <header>
                <b>
                  <i className="dot" style={{ background: s.color }} /> {s.name}
                </b>
                <span className="muted">ผลิต {s.rate} พาเลท/ชม.</span>
              </header>
              <Meter value={s.stock} max={s.capacity} color="#5b7fb8" />
              <div className="row-sub">{s.order ? `ใบสั่งซื้อ ${s.order}` : `พร้อมส่ง ${s.stock.toFixed(0)} พาเลท`}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="ชาวเมืองและการจราจร">
        <div className="stat-grid">
          <Stat label="อยู่บ้าน" value={town.atHome} unit="คน" />
          <Stat label="กำลังเดินทาง" value={town.commuting} unit="คน" tone="#facc15" />
          <Stat label="ทำงานในโรงงาน" value={town.atWork} unit="คน" tone="#4ade80" />
        </div>
        <div className="stat-grid">
          <Stat label="ไปซื้อของ" value={town.shoppers} unit="คัน" tone="#f472b6" />
          <Stat label="รถวิ่งบนถนน" value={town.carsDriving} unit="คัน" tone="#38bdf8" />
          <Stat label="รถจอดอยู่" value={town.carsParked} unit="คัน" />
        </div>
        <p className="hint">
          พนักงานขับรถจากบ้านมาจอดที่ลานจอดพนักงานตามกะ ชาวเมืองขับไปซื้อของที่ร้าน ทุกคันหยุดตามไฟจราจร 6 แยก
        </p>
      </Section>
    </>
  );
}
