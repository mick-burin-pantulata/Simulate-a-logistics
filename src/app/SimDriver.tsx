import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useSimStore } from '../store/useSimStore';

const SNAPSHOT_INTERVAL = 0.25;

/** Steps the simulation every frame and pushes a throttled snapshot to the UI. */
export function SimDriver() {
  const sinceSnapshot = useRef(0);

  useFrame((_, delta) => {
    const s = useSimStore.getState();
    // Clamp so a backgrounded tab doesn't fast-forward on return.
    if (s.running) s.advance(Math.min(delta, 0.1) * s.speed);
    sinceSnapshot.current += delta;
    if (sinceSnapshot.current >= SNAPSHOT_INTERVAL) {
      sinceSnapshot.current = 0;
      s.refresh();
    }
  });

  return null;
}
