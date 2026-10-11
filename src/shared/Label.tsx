import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

const W = 320;
const FONT = '"IBM Plex Sans Thai", "Segoe UI", "Leelawadee UI", sans-serif';

interface LabelProps {
  title: string;
  subtitle?: string;
  position: [number, number, number];
  /** Width in world units. */
  scale?: number;
  accent?: string;
}

/** Billboard sign drawn on a canvas texture (no extra React roots or font downloads). */
export function Label({ title, subtitle, position, scale = 3, accent = '#facc15' }: LabelProps) {
  const h = subtitle ? 130 : 84;
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = h;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, [h]);

  useEffect(() => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, h);
    // Navy pill with a coloured status dot, matching the DOM tags.
    ctx.fillStyle = 'rgba(28, 35, 80, 0.94)';
    ctx.beginPath();
    ctx.roundRect(4, 4, W - 8, h - 8, (h - 8) / 2.4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 175, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(34, subtitle ? 46 : h / 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 42px ${FONT}`;
    ctx.fillText(title, W / 2 + 10, subtitle ? 46 : h / 2 + 2, W - 70);
    if (subtitle) {
      ctx.fillStyle = '#aab4e8';
      ctx.font = `34px ${FONT}`;
      ctx.fillText(subtitle, W / 2 + 10, 92, W - 70);
    }
    texture.needsUpdate = true;
  }, [canvas, texture, title, subtitle, accent, h]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={[scale, (scale * h) / W, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
