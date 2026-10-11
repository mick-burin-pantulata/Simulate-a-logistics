import { Canvas } from '@react-three/fiber';
import { Agvs } from '../features/agv/scene/Agv';
import { DockArea } from '../features/docks/scene/DockArea';
import { ProductionHall } from '../features/production/scene/ProductionHall';
import { Buildings } from '../features/site/scene/Buildings';
import { Gate } from '../features/site/scene/Gate';
import { CarPark, Fence, LampPosts, Trees } from '../features/site/scene/Landscape';
import { Markings } from '../features/site/scene/Markings';
import { SiteGround } from '../features/site/scene/SiteGround';
import { YardProps } from '../features/site/scene/YardProps';
import { ZoneLabels } from '../features/site/scene/ZoneLabels';
import { Trucks } from '../features/trucks/scene/Truck';
import { Racks } from '../features/warehouse/scene/Racks';
import { WarehouseBuilding } from '../features/warehouse/scene/WarehouseBuilding';
import { Workers } from '../features/workers/scene/Worker';
import { RoutePath } from '../shared/RoutePath';
import { SelectionBrackets } from '../shared/SelectionBrackets';
import { TagProjector } from '../shared/tags/TagProjector';
import { THEME } from '../shared/theme';
import { useSimStore } from '../store/useSimStore';
import { CameraRig } from './CameraRig';
import { SimDriver } from './SimDriver';

const SUN: [number, number, number] = [-80, 110, 30];

export function Scene() {
  return (
    <Canvas
      shadows
      flat
      dpr={[1, 2]}
      orthographic
      camera={{ position: [-160, 190, 165], zoom: 4.2, near: 1, far: 2000 }}
      onPointerMissed={() => useSimStore.getState().select(null)}
    >
      <color attach="background" args={[THEME.background]} />
      <hemisphereLight args={['#c3ccff', '#2a3060', 1.35]} />
      <directionalLight
        castShadow
        position={SUN}
        color="#eef0ff"
        intensity={1.35}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-far={400}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />

      {/* Site */}
      <SiteGround />
      <Markings />
      <Fence />
      <Trees />
      <CarPark />
      <LampPosts />
      <Buildings />
      <Gate />
      <YardProps />
      <ZoneLabels />

      {/* Operations */}
      <WarehouseBuilding />
      <Racks />
      <DockArea />
      <ProductionHall />
      <Agvs />
      <Trucks />
      <Workers />

      {/* Selection overlays */}
      <RoutePath />
      <SelectionBrackets />
      <TagProjector />

      <SimDriver />
      <CameraRig />
    </Canvas>
  );
}
