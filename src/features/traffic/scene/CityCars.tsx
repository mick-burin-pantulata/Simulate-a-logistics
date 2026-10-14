import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, InstancedMesh, Matrix4, Object3D } from 'three';
import { useSimStore } from '../../../store/useSimStore';

const MAX_CARS = 220;
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

/** Every resident's car — driving, parked at home, at the shops or in the staff car parks. */
export function CityCars() {
  const bodies = useRef<InstancedMesh>(null);
  const cabins = useRef<InstancedMesh>(null);
  const lights = useRef<InstancedMesh>(null);
  const o = useMemo(() => new Object3D(), []);
  const c = useMemo(() => new Color(), []);

  useFrame(() => {
    const cars = useSimStore.getState().world.cars;
    for (let i = 0; i < MAX_CARS; i++) {
      const car = cars[i];
      if (!car) {
        bodies.current!.setMatrixAt(i, HIDDEN);
        cabins.current!.setMatrixAt(i, HIDDEN);
        lights.current!.setMatrixAt(i, HIDDEN);
        continue;
      }
      o.position.set(car.x, car.van ? 0.85 : 0.55, car.z);
      o.rotation.set(0, car.heading, 0);
      o.scale.set(1, car.van ? 2 : 1, car.van ? 1.15 : 1);
      o.updateMatrix();
      bodies.current!.setMatrixAt(i, o.matrix);
      bodies.current!.setColorAt(i, c.set(car.color));
      o.position.y = 1.15;
      o.scale.set(car.van ? 0 : 1, 1, 1);
      o.updateMatrix();
      cabins.current!.setMatrixAt(i, o.matrix);
      // Brake lights glow while stopped in traffic.
      const braking = car.state === 'driving' && car.speed < 1;
      o.position.set(car.x - Math.sin(car.heading) * 2.12, 0.7, car.z - Math.cos(car.heading) * 2.12);
      o.scale.set(braking ? 1 : 0, 1, 1);
      o.updateMatrix();
      lights.current!.setMatrixAt(i, o.matrix);
    }
    for (const m of [bodies, cabins, lights]) m.current!.instanceMatrix.needsUpdate = true;
    if (bodies.current!.instanceColor) bodies.current!.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, MAX_CARS]} castShadow frustumCulled={false}>
        <boxGeometry args={[1.8, 0.7, 4.2]} />
        <meshStandardMaterial metalness={0.4} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={cabins} args={[undefined, undefined, MAX_CARS]} castShadow frustumCulled={false}>
        <boxGeometry args={[1.6, 0.55, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.2} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, MAX_CARS]} frustumCulled={false}>
        <boxGeometry args={[1.5, 0.16, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.6} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
