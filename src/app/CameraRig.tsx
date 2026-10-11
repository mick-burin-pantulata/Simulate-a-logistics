import { CameraControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { CAMERA_PRESETS, ISO_DIR, ISO_DISTANCE, useSimStore } from '../store/useSimStore';

type Vec3 = [number, number, number];

const isoPosition = (t: Vec3): Vec3 => [
  t[0] + ISO_DIR[0] * ISO_DISTANCE,
  t[1] + ISO_DIR[1] * ISO_DISTANCE,
  t[2] + ISO_DIR[2] * ISO_DISTANCE,
];

/** Orthographic isometric camera: drag to pan/rotate, wheel to zoom; flies to presets and focused entities. */
export function CameraRig() {
  const controls = useRef<CameraControls>(null);
  const request = useSimStore((s) => s.camera);

  useEffect(() => {
    const { target, zoom } = CAMERA_PRESETS.overview;
    controls.current?.setLookAt(...isoPosition(target), ...target, false);
    controls.current?.zoomTo(zoom, false);
  }, []);

  useEffect(() => {
    if (!request || !controls.current) return;
    controls.current.setLookAt(...isoPosition(request.target), ...request.target, true);
    controls.current.zoomTo(request.zoom, true);
  }, [request]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minZoom={2.5}
      maxZoom={60}
      minPolarAngle={0.35}
      maxPolarAngle={1.2}
      smoothTime={0.5}
      dollyToCursor
    />
  );
}
