import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

export const FONT = '"IBM Plex Sans Thai", "Segoe UI", "Leelawadee UI", sans-serif';

const cache = new Map<string, { texture: CanvasTexture; aspect: number }>();

function finish(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Single line of painted text on a transparent background (cached by content). */
export function textTexture(text: string, color: string, weight = '700 italic') {
  const key = `text|${text}|${color}|${weight}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const h = 128;
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = `${weight} 96px ${FONT}`;
  const w = Math.ceil(probe.measureText(text).width + 40);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${weight} 96px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20, h / 2 + 4);
  const out = { texture: finish(canvas), aspect: w / h };
  cache.set(key, out);
  return out;
}

/** Diagonal yellow/black hazard stripes, tiling horizontally. */
export function hazardTexture() {
  const key = 'hazard';
  const hit = cache.get(key);
  if (hit) return hit.texture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b1f3a';
  ctx.fillRect(0, 0, 64, 32);
  ctx.fillStyle = '#e0ad24';
  for (let x = -32; x < 96; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 32);
    ctx.lineTo(x + 16, 32);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 16, 0);
    ctx.closePath();
    ctx.fill();
  }
  const texture = finish(canvas);
  texture.wrapS = RepeatWrapping;
  cache.set(key, { texture, aspect: 2 });
  return texture;
}

/** Chain-link fence mesh (diamond grid) with transparent gaps. */
export function chainLinkCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#9aa6d6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(64, 64);
  ctx.moveTo(64, 0);
  ctx.lineTo(0, 64);
  ctx.stroke();
  ctx.fillStyle = '#9aa6d6';
  ctx.fillRect(0, 0, 64, 4);
  return canvas;
}

export function repeatingTexture(canvas: HTMLCanvasElement, repeatX: number, repeatY: number) {
  const texture = finish(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

/** Side branding for a trailer: logo tile, company name and tagline. */
export function brandTexture(brand: string, color: string) {
  const key = `brand|${brand}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit.texture;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(40, 60, 110, 110, 16);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(95, 80);
  ctx.lineTo(95, 150);
  ctx.moveTo(60, 115);
  ctx.lineTo(130, 115);
  ctx.stroke();
  ctx.fillStyle = '#1f2a5c';
  ctx.font = `700 96px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(brand, 180, 108);
  ctx.font = `500 34px ${FONT}`;
  ctx.fillStyle = '#4a5590';
  ctx.fillText('Nationwide freight · ขนส่งทั่วประเทศ', 184, 182);
  ctx.fillStyle = color;
  ctx.fillRect(0, 226, 1024, 30);
  const texture = finish(canvas);
  cache.set(key, { texture, aspect: 4 });
  return texture;
}
