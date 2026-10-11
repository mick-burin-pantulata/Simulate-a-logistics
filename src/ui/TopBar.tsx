import { CAMERA_PRESETS, useSimStore, type CameraPreset } from '../store/useSimStore';
import { clock } from './format';
import { Icons } from './icons';

const SPEEDS = [0.5, 1, 2, 4, 8];

export function TopBar() {
  const running = useSimStore((s) => s.running);
  const speed = useSimStore((s) => s.speed);
  const time = useSimStore((s) => s.snapshot.time);
  const togglePlay = useSimStore((s) => s.togglePlay);
  const reset = useSimStore((s) => s.reset);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const flyTo = useSimStore((s) => s.flyTo);

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
        <div className="clock">
          <span className={`live ${running ? 'on' : ''}`} />
          <b>{clock(time)}</b>
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
