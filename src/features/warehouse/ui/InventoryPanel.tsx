import { useSimStore } from '../../../store/useSimStore';
import { Badge, Meter, Section, Sparkline, Stat } from '../../../ui/components';
import { pct } from '../../../ui/format';

export function InventoryPanel() {
  const kpi = useSimStore((s) => s.snapshot.kpi);
  const lines = useSimStore((s) => s.snapshot.lines);
  const history = useSimStore((s) => s.snapshot.history);
  const max = Math.max(1, ...history.map((h) => Math.max(h.raw, h.finished)));

  return (
    <>
      <div className="stat-grid">
        <Stat label="วัตถุดิบ" value={kpi.rawStock} unit="พาเลท" tone="#5b7fb8" />
        <Stat label="สินค้าสำเร็จ" value={kpi.finishedStock} unit="พาเลท" tone="#c08a4b" />
        <Stat label="พื้นที่ใช้" value={pct(kpi.occupancy)} />
      </div>
      <Section
        title="สต็อกในคลัง"
        aside={
          <span className="legend-inline">
            <i style={{ background: '#5b7fb8' }} /> วัตถุดิบ <i style={{ background: '#c08a4b' }} /> สินค้าสำเร็จ
          </span>
        }
      >
        <Sparkline
          series={[
            { values: history.map((h) => h.raw), color: '#5b7fb8', max },
            { values: history.map((h) => h.finished), color: '#c08a4b', max },
          ]}
        />
        <Meter value={kpi.occupancy} color={kpi.occupancy > 0.85 ? '#f87171' : '#4ade80'} />
        <p className="hint">
          ชั้นวางเก็บทั้งวัตถุดิบ (ห่อฟิล์มสีน้ำเงิน) และสินค้าสำเร็จ (กล่องสีน้ำตาล) — วัตถุดิบมาจากซัพพลายเออร์ในเมือง
          สินค้าสำเร็จส่งไปร้านค้า
        </p>
      </Section>

      <Section title="ฝ่ายผลิต: วัตถุดิบเข้า → สินค้าออก">
        {lines.map((l, i) => (
          <div key={i} className="line-row">
            <div className="kv">
              <span>
                Line {String.fromCharCode(65 + i)}{' '}
                <small className="muted">
                  · คนประจำเครื่อง {l.crew}/4 · วัตถุดิบข้างไลน์ {l.raw}/2
                </small>
              </span>
              {l.starved ? (
                <Badge label="ขาดวัตถุดิบ" color="#f87171" />
              ) : l.ready ? (
                <Badge label="รอพันฟิล์ม" color="#f59e0b" />
              ) : (
                <b>{pct(l.progress)}</b>
              )}
            </div>
            <Meter value={l.progress} color={l.starved ? '#f87171' : l.ready ? '#f59e0b' : '#38bdf8'} />
          </div>
        ))}
        <div className="stat-grid two">
          <Stat label="ผลิตแล้ว" value={kpi.produced} unit="พาเลท" tone="#38bdf8" />
          <Stat label="บนสายพานสินค้า" value={kpi.onConveyor} unit="พาเลท" tone="#e3b324" />
        </div>
        <p className="hint">
          AGV หยิบวัตถุดิบไปวางบนสายพานฝั่งตะวันตก → ไลน์ผลิต 1 พาเลทวัตถุดิบต่อ 1 พาเลทสินค้า → พันฟิล์ม → สายพานฝั่งตะวันออก
          กลับเข้าคลัง
        </p>
      </Section>

      <Section title="งานในคลัง">
        <div className="stat-grid two">
          <Stat label="รอ AGV" value={kpi.pendingTasks} unit="งาน" />
          <Stat label="กำลังดำเนินการ" value={kpi.activeTasks} unit="งาน" />
        </div>
      </Section>
    </>
  );
}
