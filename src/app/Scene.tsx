import { Canvas } from '@react-three/fiber';
import { Agvs } from '../features/agv/scene/Agv';
import { CityBuildings } from '../features/city/scene/CityBuildings';
import { RoadNetwork } from '../features/roads/scene/RoadNetwork';
import { CityCars } from '../features/traffic/scene/CityCars';
import { Conveyor } from '../features/conveyor/scene/Conveyor';
import { DockArea } from '../features/docks/scene/DockArea';
import { ProductionHall } from '../features/production/scene/ProductionHall';
import { Buildings } from '../features/site/scene/Buildings';
import { Gate } from '../features/site/scene/Gate';
import { CarPark, Fence, LampPosts, Trees } from '../features/site/scene/Landscape';
import { Markings } from '../features/site/scene/Markings';
import { SiteGround } from '../features/site/scene/SiteGround';
import { ZONES } from '../features/site/layout';
import { YardProps } from '../features/site/scene/YardProps';
import { ZoneLabels } from '../features/site/scene/ZoneLabels';
import { DayNight } from '../features/time/scene/DayNight';
import { Trucks } from '../features/trucks/scene/Truck';
import { TruckPark } from '../features/trucks/scene/TruckPark';
import { Racks } from '../features/warehouse/scene/Racks';
import { WarehouseBuilding } from '../features/warehouse/scene/WarehouseBuilding';
import { Workers } from '../features/workers/scene/Worker';
import { RoutePath } from '../shared/RoutePath';
import { SelectionBrackets } from '../shared/SelectionBrackets';
import { TagProjector } from '../shared/tags/TagProjector';
import { useSimStore } from '../store/useSimStore';
import { CameraRig } from './CameraRig';
import { SimDriver } from './SimDriver';

export function Scene() {
  return (
    <Canvas
      shadows
      flat
      dpr={[1, 2]}
      orthographic
      camera={{ position: [-560, 650, 570], zoom: 1.2, near: 1, far: 4000 }}
      onPointerMissed={() => useSimStore.getState().select(null)}
    >
      <DayNight />

      {/* Town */}
      <RoadNetwork />
      <CityBuildings />
      <CityCars />

      {/* Site */}
      <SiteGround />
      <Markings />
      <Fence />
      <Trees />
      <CarPark area={ZONES.carParkWest} />
      <CarPark area={ZONES.carParkEast} />
      <LampPosts />
      <Buildings />
      <Gate />
      <YardProps />
      <TruckPark />
      <ZoneLabels />

      {/* Operations */}
      <WarehouseBuilding />
      <Racks />
      <DockArea />
      <ProductionHall />
      <Conveyor />
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
