import { MAX_AGVS } from '../../features/warehouse/layout';
import { useSimStore } from '../../store/useSimStore';
import { Section } from '../components';

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="slider">
      <span>
        {label}
        <b>{display}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i />
    </label>
  );
}

export function SettingsPanel() {
  const settings = useSimStore((s) => s.settings);
  const agvCount = useSimStore((s) => s.agvIds.length);
  const update = useSimStore((s) => s.updateSettings);
  const setAgvCount = useSimStore((s) => s.setAgvCount);

  return (
    <>
      <Section title="ทรัพยากร">
        <Slider label="จำนวนรถ AGV" value={agvCount} display={`${agvCount} คัน`} min={1} max={MAX_AGVS} step={1} onChange={setAgvCount} />
      </Section>
      <Section title="ความต้องการในเมือง">
        <Slider
          label="ชาวเมืองออกไปซื้อของ"
          value={settings.demand}
          display={`×${settings.demand.toFixed(1)}`}
          min={0.2}
          max={2.5}
          step={0.1}
          onChange={(v) => update({ demand: v })}
        />
        <Slider
          label="ร้านค้าสั่งของเมื่อเหลือ"
          value={settings.storeReorder}
          display={`${Math.round(settings.storeReorder * 100)}% ของชั้นวาง`}
          min={0.1}
          max={0.8}
          step={0.05}
          onChange={(v) => update({ storeReorder: v })}
        />
        <p className="hint">
          ชาวเมืองซื้อของมากช่วงเที่ยงและหลังเลิกงาน (ร้านเปิด 08–22 น.) — ยิ่งซื้อมาก ร้านยิ่งสั่งบ่อย รถส่งของยิ่งวิ่งถี่
          ถ้าเกินกำลังผลิต สต็อกสินค้าสำเร็จในคลังจะลดลงจนร้านขาดของ
        </p>
      </Section>
      <Section title="การจัดซื้อวัตถุดิบ">
        <Slider
          label="สั่งวัตถุดิบเมื่อเหลือต่ำกว่า"
          value={settings.rawReorder}
          display={`${settings.rawReorder} พาเลท`}
          min={20}
          max={200}
          step={10}
          onChange={(v) => update({ rawReorder: v })}
        />
        <p className="hint">นับรวมของในชั้นวาง บนสายพาน ข้างไลน์ผลิต และที่สั่งไว้แล้ว — ตั้งต่ำเกินไปไลน์ผลิตจะขาดวัตถุดิบ</p>
      </Section>
      <Section title="การจราจร">
        <Slider
          label="ไฟเขียวต่อทิศ"
          value={settings.signalGreen}
          display={`${settings.signalGreen} วินาที`}
          min={6}
          max={30}
          step={1}
          onChange={(v) => update({ signalGreen: v })}
        />
      </Section>
      <Section title="การแสดงผล">
        <Toggle label="แสดงเส้นทางของสิ่งที่เลือก" checked={settings.showPaths} onChange={(v) => update({ showPaths: v })} />
        <Toggle label="แสดงป้ายชื่อโซน" checked={settings.showLabels} onChange={(v) => update({ showLabels: v })} />
        <Toggle label="แสดงป้ายทะเบียนเหนือรถบรรทุก" checked={settings.showTags} onChange={(v) => update({ showTags: v })} />
      </Section>
    </>
  );
}
