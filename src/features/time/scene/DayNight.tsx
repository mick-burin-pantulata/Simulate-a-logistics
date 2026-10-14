import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, DirectionalLight, HemisphereLight } from 'three';
import { applyNight } from '../../../shared/nightMaterials';
import { THEME } from '../../../shared/theme';
import { useSimStore } from '../../../store/useSimStore';
import { daylight, hourOfDay } from '../clock';

const DAY_BG = new Color(THEME.background);
const NIGHT_BG = new Color('#0d1230');
const SUN_DAY = new Color('#eef0ff');
const SUN_LOW = new Color('#ffc58a');
const MOON = new Color('#8796ff');
const SKY_DAY = new Color('#c3ccff');
const SKY_NIGHT = new Color('#3a4a9a');

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Sun/moon, sky tint and night lighting driven by the game clock. */
export function DayNight() {
  const sun = useRef<DirectionalLight>(null);
  const sky = useRef<HemisphereLight>(null);
  const scene = useThree((s) => s.scene);
  const bg = useMemo(() => new Color(), []);

  useFrame(() => {
    const h = hourOfDay(useSimStore.getState().world.time);
    const d = daylight(h);
    const night = 1 - smooth(0.02, 0.25, d);

    // Sun sweeps east → west across the south sky; at night a fixed moon takes over.
    const az = ((h - 6) / 12) * Math.PI;
    if (d > 0.02) {
      sun.current!.position.set(Math.cos(az) * 450, 120 + d * 420, 150 - d * 75);
      sun.current!.color.copy(SUN_LOW).lerp(SUN_DAY, smooth(0.05, 0.4, d));
      sun.current!.intensity = 0.35 + d * 1.1;
    } else {
      sun.current!.position.set(-180, 360, -120);
      sun.current!.color.copy(MOON);
      sun.current!.intensity = 0.35;
    }
    sky.current!.intensity = 0.55 + (1 - night) * 0.85;
    sky.current!.color.copy(SKY_NIGHT).lerp(SKY_DAY, 1 - night);

    bg.copy(NIGHT_BG).lerp(DAY_BG, 1 - night);
    scene.background = bg;
    applyNight(night);
  });

  return (
    <>
      <hemisphereLight ref={sky} args={['#c3ccff', '#2a3060', 1.35]} />
      <directionalLight
        ref={sun}
        castShadow
        position={[-80, 110, 30]}
        color="#eef0ff"
        intensity={1.35}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-430}
        shadow-camera-right={430}
        shadow-camera-top={430}
        shadow-camera-bottom={-430}
        shadow-camera-far={1800}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
    </>
  );
}
