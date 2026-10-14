import { clockLabel, currentShift, dayNumber, daylight, hourOfDay } from '../features/time/clock';
import { CAMERA_PRESETS, useSimStore, type CameraPreset } from '../store/useSimStore';
import { Icons } from './icons';

const SPEEDS = [1, 2, 4, 8, 16, 32];

function SkyIcon({ hour }: { hour: number }) {
  const day = daylight(hour) > 0.05;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      {day ? (
        <g stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" fill="none">
          <circle cx="12" cy="12" r="4.2" fill="#fcd34d" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <line key={i} x1={12 + Math.cos(a) * 7} y1={12 + Math.sin(a) * 7} x2={12 + Math.cos(a) * 9.5} y2={12 + Math.sin(a) * 9.5} />;
          })}
        </g>
      ) : (
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#c7d2fe" />
      )}
    </svg>
  );
}

export function TopBar() {
  const running = useSimStore((s) => s.running);
  const speed = useSimStore((s) => s.speed);
  const time = useSimStore((s) => s.snapshot.time);
  const togglePlay = useSimStore((s) => s.togglePlay);
  const reset = useSimStore((s) => s.reset);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const flyTo = useSimStore((s) => s.flyTo);
  const hour = hourOfDay(time);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">{Icons.truck}</div>
        <div>
          <b>LogiSim Factory</b>
          <span>จำลองโลจิสติกส์โรงงาน</span>
        </div>
      </div>

      <div className="transport">
        <div className="clock" title="1 วินาทีจริง = 20 วินาทีในเกม (ที่ 1×)">
          <SkyIcon hour={hour} />
          <div className="clock-text">
            <b>{clockLabel(time)}</b>
            <span>
              วันที่ {dayNumber(time)} · {currentShift(hour) === 'day' ? 'กะเช้า' : 'กะดึก'}
            </span>
          </div>
          <span className={`live ${running ? 'on' : ''}`} />
        </div>
        <button className="icon-btn primary" onClick={togglePlay} title={running ? 'หยุดชั่วคราว' : 'เล่น'}>
          {running ? Icons.pause : Icons.play}
        </button>
        <button className="icon-btn" onClick={reset} title="เริ่มใหม่">
          {Icons.reset}
        </button>
        <div className="segmented" role="group" aria-label="ความเร็ว">
          {SPEEDS.map((v) => (
            <button key={v} className={v === speed ? 'active' : ''} onClick={() => setSpeed(v)}>
              {v}×
            </button>
          ))}
        </div>
      </div>

      <nav className="cameras" aria-label="มุมกล้อง">
        {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((k) => (
          <button key={k} onClick={() => flyTo(k)}>
            {CAMERA_PRESETS[k].label}
          </button>
        ))}
      </nav>
    </header>
  );
}
