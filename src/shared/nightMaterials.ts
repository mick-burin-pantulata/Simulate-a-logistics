import { AdditiveBlending, CanvasTexture, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { THEME } from './theme';

function poolTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

const POOL = poolTexture();

/**
 * Materials whose brightness follows the time of day. They are shared module-level
 * instances so DayNight can update every window and lamp with one write per frame.
 */
export const windowMaterial = new MeshStandardMaterial({
  color: THEME.window,
  emissive: '#f3d9a0',
  emissiveIntensity: 0.4,
  roughness: 0.3,
});

export const lampHeadMaterial = new MeshStandardMaterial({
  color: '#fef9c3',
  emissive: '#fde68a',
  emissiveIntensity: 0.2,
  toneMapped: false,
});

/** Warm pool of light on the ground under street lamps and high-bay fittings. */
export const lightPoolMaterial = new MeshBasicMaterial({
  map: POOL,
  color: '#ffd98a',
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: AdditiveBlending,
  toneMapped: false,
});

/** Headlight beam on the road in front of trucks. */
export const headlightMaterial = new MeshBasicMaterial({
  map: POOL,
  color: '#fff1c9',
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: AdditiveBlending,
  toneMapped: false,
});

/** 0 = full day, 1 = full night. */
export function applyNight(night: number) {
  windowMaterial.emissiveIntensity = 0.25 + night * 1.6;
  lampHeadMaterial.emissiveIntensity = 0.2 + night * 2.5;
  lightPoolMaterial.opacity = night * 0.5;
  headlightMaterial.opacity = night * 0.65;
}
