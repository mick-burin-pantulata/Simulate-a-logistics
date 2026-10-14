import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { CAMERA_PRESETS, ISO_DIR, ISO_DISTANCE, useSimStore } from '../store/useSimStore';
import { entityPosition } from '../world/snapshot';

type Vec3 = [number, number, number];

const isoPosition = (t: Vec3): Vec3 => [
  t[0] + ISO_DIR[0] * ISO_DISTANCE,
  t[1] + ISO_DIR[1] * ISO_DISTANCE,
  t[2] + ISO_DIR[2] * ISO_DISTANCE,
];

/** How quickly the follow camera catches up with its target (1/s); high = tight. */
const FOLLOW_RATE = 6;

const A = CameraControlsImpl.ACTION;
/** camera-controls actions that move the target sideways (mouse and touch). */
const PAN_ACTIONS =
  A.TRUCK |
  A.SCREEN_PAN |
  A.TOUCH_TRUCK |
  A.TOUCH_SCREEN_PAN |
  A.TOUCH_DOLLY_TRUCK |
  A.TOUCH_DOLLY_SCREEN_PAN |
  A.TOUCH_ZOOM_TRUCK |
  A.TOUCH_ZOOM_SCREEN_PAN;

/**
 * Orthographic isometric camera: drag to pan/rotate, wheel to zoom; flies to presets and
 * focused entities, and keeps a followed entity centred until the user pans away.
 */
export function CameraRig() {
  const controls = useRef<CameraControls>(null);
  const request = useSimStore((s) => s.camera);
  const following = useSimStore((s) => s.following);
  const target = useRef(new Vector3());

  useEffect(() => {
    const { target, zoom } = CAMERA_PRESETS.city;
    controls.current?.setLookAt(...isoPosition(target), ...target, false);
    controls.current?.zoomTo(zoom, false);
  }, []);

  useEffect(() => {
    if (!request || !controls.current) return;
    controls.current.setLookAt(...isoPosition(request.target), ...request.target, true);
    controls.current.zoomTo(request.zoom, true);
  }, [request]);

  // Panning away ends following; zooming and rotating orbit the followed entity and keep it.
  useEffect(() => {
    const c = controls.current;
    if (!c || !following) return;
    const onStart = () => {
      if (c.currentAction & PAN_ACTIONS) useSimStore.getState().setFollowing(false);
    };
    c.addEventListener('controlstart', onStart);
    return () => c.removeEventListener('controlstart', onStart);
  }, [following]);

  useFrame((_, dt) => {
    const c = controls.current;
    const { following, selected, world } = useSimStore.getState();
    if (!c || !following || !selected) return;
    const pos = entityPosition(world, selected);
    if (!pos) return;
    c.getTarget(target.current, false);
    // Exponential smoothing so the view glides instead of snapping each frame.
    const k = 1 - Math.exp(-FOLLOW_RATE * Math.min(dt, 0.1));
    const x = target.current.x + (pos.x - target.current.x) * k;
    const z = target.current.z + (pos.z - target.current.z) * k;
    c.moveTo(x, 0.5, z, false);
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minZoom={0.6}
      maxZoom={60}
      minPolarAngle={0.35}
      maxPolarAngle={1.2}
      smoothTime={0.5}
      dollyToCursor
    />
  );
}
