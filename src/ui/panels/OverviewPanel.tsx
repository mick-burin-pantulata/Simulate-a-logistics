import { AGV_STATE } from '../../features/agv/labels';
import { TRUCK_PHASE } from '../../features/trucks/labels';
import { useSimStore } from '../../store/useSimStore';
import { Badge, Meter, Section, Sparkline, Stat } from '../components';
import { duration, pct } from '../format';

export function OverviewPanel() {
  const snap = useSimStore((s) => s.snapshot);
  const { kpi, history } = snap;
  const docked = snap.trucks.filter((t) => t.phase === 'docked').length;

  return (
    <>
      <div className="stat-grid">
        <Stat label="รับเข้า" value={kpi.received} unit="พาเลท" tone="#38bdf8" />
        <Stat label="ส่งออก" value={kpi.shipped} unit="พาเลท" tone="#4ade80" />
        <Stat label="รถให้บริการ" value={kpi.trucksServed} unit="คัน" tone="#facc15" />
      </div>

      <Section
        title="ปริมาณรับ-ส่งสะสม"
        aside={
          <span className="legend-inline">
            <i style={{ background: '#38bdf8' }} /> รับเข้า <i style={{ background: '#4ade80' }} /> ส่งออก
          </span>
        }
      >
        <Sparkline
          series={[
            { values: history.map((h) => h.received), color: '#38bdf8', max: Math.max(1, ...history.map((h) => Math.max(h.received, h.shipped))) },
            { values: history.map((h) => h.shipped), color: '#4ade80', max: Math.max(1, ...history.map((h) => Math.max(h.received, h.shipped))) },
          ]}
        />
      </Section>

      <Section title="ตัวชี้วัดการดำเนินงาน">
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
        <div className="kv">
          <span>เวลาเฉลี่ยรถบรรทุกในโรงงาน</span>
          <b>{kpi.avgTurnaround ? `${duration(kpi.avgTurnaround)} นาที` : '—'}</b>
        </div>
        <div className="kv">
          <span>รถในโรงงาน / เทียบท่า</span>
          <b>
            {kpi.trucksOnSite} / {docked}
          </b>
        </div>
        <div className="kv">
          <span>งานคลังรอคิว / กำลังทำ</span>
          <b>
            {kpi.pendingTasks} / {kpi.activeTasks}
          </b>
        </div>
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
            {(['gateIn', 'toDock', 'docked', 'departing'] as const).map((k) => (
              <Badge key={k} {...TRUCK_PHASE[k]} />
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
