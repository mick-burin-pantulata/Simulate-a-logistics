import { AGV_STATE } from '../../features/agv/labels';
import { clockLabel, currentShift, dayNumber, hourOfDay, spanLabel } from '../../features/time/clock';
import { TRUCK_PHASE } from '../../features/trucks/labels';
import { useSimStore } from '../../store/useSimStore';
import { Badge, Meter, Section, Sparkline, Stat } from '../components';
import { pct } from '../format';

export function OverviewPanel() {
  const snap = useSimStore((s) => s.snapshot);
  const { kpi, history } = snap;
  const docked = snap.trucks.filter((t) => t.phase === 'docked').length;
  const h = hourOfDay(snap.time);
  const shift = currentShift(h);
  const max = Math.max(1, ...history.map((p) => Math.max(p.received, p.shipped, p.produced)));

  return (
    <>
      <div className="shift-card">
        <div>
          <span className="eyebrow">วันที่ {dayNumber(snap.time)}</span>
          <b>{clockLabel(snap.time)} น.</b>
        </div>
        <div className="shift-meta">
          <Badge label={shift === 'day' ? 'กะเช้า 07–19' : 'กะดึก 19–07'} color={shift === 'day' ? '#facc15' : '#818cf8'} />
          <span className="muted">พนักงานปฏิบัติงาน {kpi.staffOnDuty} คน</span>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="รับเข้า" value={kpi.received} unit="พาเลท" tone="#38bdf8" />
        <Stat label="ส่งออก" value={kpi.shipped} unit="พาเลท" tone="#4ade80" />
        <Stat label="ผลิต" value={kpi.produced} unit="พาเลท" tone="#e3b324" />
      </div>

      <Section
        title="ปริมาณสะสม"
        aside={
          <span className="legend-inline">
            <i style={{ background: '#38bdf8' }} /> รับ <i style={{ background: '#4ade80' }} /> ส่ง <i style={{ background: '#e3b324' }} /> ผลิต
          </span>
        }
      >
        <Sparkline
          series={[
            { values: history.map((p) => p.received), color: '#38bdf8', max },
            { values: history.map((p) => p.shipped), color: '#4ade80', max },
            { values: history.map((p) => p.produced), color: '#e3b324', max },
          ]}
        />
      </Section>

      <Section title="รถบรรทุกและคิว">
        <div className="kv">
          <span>ในโรงงาน / เทียบท่า / รอคิว</span>
          <b>
            {kpi.trucksOnSite} / {docked} / {kpi.queue}
          </b>
        </div>
        <div className="kv">
          <span>เวลารอคิวเฉลี่ย</span>
          <b>{kpi.avgQueueWait ? spanLabel(kpi.avgQueueWait) : '—'}</b>
        </div>
        <div className="kv">
          <span>เวลาอยู่ในโรงงานเฉลี่ย (เข้า–ออกประตู)</span>
          <b>{kpi.avgTurnaround ? spanLabel(kpi.avgTurnaround) : '—'}</b>
        </div>
        <div className="kv">
          <span>ให้บริการแล้ว</span>
          <b>{kpi.trucksServed} คัน</b>
        </div>
      </Section>

      <Section title="คลังและ AGV">
        <div className="kv">
          <span>พื้นที่คลังที่ใช้</span>
          <b>{pct(kpi.occupancy)}</b>
        </div>
        <Meter value={kpi.occupancy} color="#a78bfa" />
        <div className="kv">
          <span>อัตราใช้งาน AGV</span>
          <b>{pct(kpi.agvUtil)}</b>
        </div>
        <Meter value={kpi.agvUtil} color="#7c95ff" />
      </Section>

      <Section title="สัญลักษณ์สถานะ">
        <div className="legend-grid">
          <span className="muted">AGV</span>
          <div>
            {(['idle', 'toPickup', 'loading', 'toDrop', 'toPark'] as const).map((k) => (
              <Badge key={k} {...AGV_STATE[k]} />
            ))}
          </div>
          <span className="muted">รถบรรทุก</span>
          <div>
            {(['gateIn', 'waiting', 'toDock', 'docked', 'gateOut'] as const).map((k) => (
              <Badge key={k} {...TRUCK_PHASE[k]} />
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
