import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Vector3 } from 'three';
import { useSimStore } from '../../store/useSimStore';
import { tagAnchor, tagElements } from './registry';

/** Moves every registered DOM tag to its entity's projected screen position. */
export function TagProjector() {
  const v = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    const world = useSimStore.getState().world;
    tagElements.forEach((el, key) => {
      const anchor = tagAnchor(world, key);
      if (!anchor) {
        el.style.visibility = 'hidden';
        return;
      }
      v.set(...anchor).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const onScreen = v.z < 1 && x > -200 && x < size.width + 200 && y > -100 && y < size.height + 100;
      el.style.visibility = onScreen ? 'visible' : 'hidden';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    });
  });

  return null;
}
