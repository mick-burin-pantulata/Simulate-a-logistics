import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { Color, InstancedMesh, Matrix4, Object3D } from 'three';
import { useSimStore } from '../../../store/useSimStore';
import { LEVEL_Y, RACKS, SLOTS_PER_RACK, slotWorld } from '../layout';

const RACK_W = 1.8;
const RACK_D = 1.6;
const RACK_H = 2.8;
const BOX = 0.68;
const BOX_COLORS = ['#8a5a2b', '#9c6a36', '#7c4f25', '#a8743d', '#2f5fb3', '#c9d0f0'];
const POSTS = 4;
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

export function Racks() {
  const posts = useRef<InstancedMesh>(null);
  const beams = useRef<InstancedMesh>(null);
  const boxes = useRef<InstancedMesh>(null);
  const boxMatrices = useRef<Matrix4[]>([]);
  const shownVersion = useRef(-1);
  const shownWorld = useRef<unknown>(null);

  useLayoutEffect(() => {
    const d = new Object3D();
    const color = new Color();
    RACKS.forEach((rack, r) => {
      [-1, 1].forEach((sx, i) =>
        [-1, 1].forEach((sz, j) => {
          d.position.set(rack.x + (sx * RACK_W) / 2, RACK_H / 2, rack.z + (sz * RACK_D) / 2);
          d.updateMatrix();
          posts.current!.setMatrixAt(r * POSTS + i * 2 + j, d.matrix);
        }),
      );
      LEVEL_Y.forEach((y, l) => {
        d.position.set(rack.x, y, rack.z);
        d.updateMatrix();
        beams.current!.setMatrixAt(r * LEVEL_Y.length + l, d.matrix);
      });
      for (let s = 0; s < SLOTS_PER_RACK; s++) {
        const p = slotWorld(rack, s);
        const h = 0.85 + ((r * 7 + s * 3) % 5) * 0.07;
        d.position.set(p.x, p.y + 0.05 + (BOX * h) / 2, p.z);
        d.scale.set(1, h, 1);
        d.updateMatrix();
        d.scale.set(1, 1, 1);
        const idx = r * SLOTS_PER_RACK + s;
        boxMatrices.current[idx] = d.matrix.clone();
        boxes.current!.setColorAt(idx, color.set(BOX_COLORS[(r + s * 2) % BOX_COLORS.length]));
      }
    });
    posts.current!.instanceMatrix.needsUpdate = true;
    beams.current!.instanceMatrix.needsUpdate = true;
    boxes.current!.instanceColor!.needsUpdate = true;
  }, []);

  // Only rewrite box matrices when the inventory actually changed.
  useFrame(() => {
    const world = useSimStore.getState().world;
    const inv = world.inventory;
    if (inv.version === shownVersion.current && shownWorld.current === world) return;
    shownVersion.current = inv.version;
    shownWorld.current = world;
    inv.slots.forEach((rack, r) =>
      rack.forEach((slot, s) => {
        const idx = r * SLOTS_PER_RACK + s;
        boxes.current!.setMatrixAt(idx, slot.full ? boxMatrices.current[idx] : HIDDEN);
      }),
    );
    boxes.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, undefined, RACKS.length * POSTS]} castShadow>
        <boxGeometry args={[0.1, RACK_H, 0.1]} />
        <meshStandardMaterial color="#2a3a8c" metalness={0.3} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={beams} args={[undefined, undefined, RACKS.length * LEVEL_Y.length]} castShadow receiveShadow>
        <boxGeometry args={[RACK_W, 0.08, RACK_D]} />
        <meshStandardMaterial color="#d9772b" metalness={0.2} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={boxes} args={[undefined, undefined, RACKS.length * SLOTS_PER_RACK]} castShadow receiveShadow>
        <boxGeometry args={[BOX, BOX, BOX]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
    </group>
  );
}
