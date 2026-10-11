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
      <Section title="ตารางรถบรรทุก">
        <Slider
          label="รถขาเข้า มาทุก ๆ"
          value={settings.inboundEvery}
          display={`~${settings.inboundEvery} วิ`}
          min={15}
          max={120}
          step={5}
          onChange={(v) => update({ inboundEvery: v })}
        />
        <Slider
          label="รถขาออก มาทุก ๆ"
          value={settings.outboundEvery}
          display={`~${settings.outboundEvery} วิ`}
          min={15}
          max={120}
          step={5}
          onChange={(v) => update({ outboundEvery: v })}
        />
        <p className="hint">จำกัดรถได้ครั้งละหนึ่งคันต่อท่า (รับเข้า 2 ท่า, ส่งออก 3 ท่า)</p>
      </Section>
      <Section title="การแสดงผล">
        <Toggle label="แสดงเส้นทางของสิ่งที่เลือก" checked={settings.showPaths} onChange={(v) => update({ showPaths: v })} />
        <Toggle label="แสดงป้ายชื่อโซน" checked={settings.showLabels} onChange={(v) => update({ showLabels: v })} />
        <Toggle label="แสดงป้ายทะเบียนเหนือรถบรรทุก" checked={settings.showTags} onChange={(v) => update({ showTags: v })} />
      </Section>
    </>
  );
}
