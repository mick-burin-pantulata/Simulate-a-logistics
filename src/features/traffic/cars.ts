import { forward, pick, type V2 } from '../../core/math';
import { Path } from '../../core/path';
import type { World } from '../../world/types';
import { carArrival, carDeparture, facilityById, type Facility } from '../city/layout';
import { planRoute } from '../roads/network';
import { CAR_ID_BASE, mustYield, type Agent } from './collision';
import { signalSpeedCap, stopLinesFor, type StopLine } from './signals';

/** commute = to work, shop = driving to a store, shopping = parked at one, home = going/at home. */
export type CarPurpose = 'commute' | 'shop' | 'shopping' | 'home';

export interface Car {
  id: number;
  color: string;
  van: boolean;
  /** Worker id (commuter) or -1 for a household shopping trip. */
  ownerId: number;
  state: 'parked' | 'driving' | 'gone';
  purpose: CarPurpose;
  facilityId: string;
  spot: number;
  path: Path;
  s: number;
  speed: number;
  stops: StopLine[];
  blockers: number[];
  blockedFor: number;
  ghostFor: number;
  x: number;
  z: number;
  heading: number;
  /** Shoppers: when to head home. */
  timer: number;
  storeId: string | null;
  /** Household cars: the home they return to. */
  homeId: string | null;
}

const CITY_SPEED = 12;
const LOT_SPEED = 4;
const ACCEL = 3;
const BRAKE = 4;
const CAR_LEN = 4.2;

const COLORS = ['#f8fafc', '#1f2937', '#9ca3af', '#b91c1c', '#1d4ed8', '#0f766e', '#e3b324', '#7c3aed', '#e2e8f0', '#78716c'];

// ---- Parking spots -------------------------------------------------------------

export function spotsOf(w: World, facilityId: string): (number | null)[] {
  if (!w.parking[facilityId]) w.parking[facilityId] = facilityById.get(facilityId)!.spots.map(() => null);
  return w.parking[facilityId];
}

/** Reserve a free spot at a facility for a car; -1 if the lot is full. */
export function reserveSpot(w: World, facilityId: string, carId: number): number {
  const spots = spotsOf(w, facilityId);
  const free = spots.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  if (!free.length) return -1;
  const i = pick(free);
  spots[i] = carId;
  return i;
}

export function releaseSpot(w: World, facilityId: string, spot: number, carId: number) {
  const spots = spotsOf(w, facilityId);
  if (spots[spot] === carId) spots[spot] = null;
}

// ---- Cars ------------------------------------------------------------------------

function placeAt(car: Car, f: Facility, spot: number) {
  const s = f.spots[spot];
  car.x = s.x;
  car.z = s.z;
  car.heading = s.heading;
}

export function createParkedCar(
  w: World,
  ownerId: number,
  facilityId: string,
  spot: number,
  purpose: CarPurpose = 'home',
  reserve = true,
): Car {
  const id = CAR_ID_BASE + w.nextCarId++;
  const car: Car = {
    id,
    color: COLORS[id % COLORS.length],
    van: id % 7 === 0,
    ownerId,
    state: 'parked',
    purpose,
    facilityId,
    spot,
    path: new Path([{ x: 0, z: 0 }]),
    s: 0,
    speed: 0,
    stops: [],
    blockers: [],
    blockedFor: 0,
    ghostFor: 0,
    x: 0,
    z: 0,
    heading: 0,
    timer: 0,
    storeId: null,
    homeId: null,
  };
  if (reserve) spotsOf(w, facilityId)[spot] = id;
  placeAt(car, facilityById.get(facilityId)!, spot);
  w.cars.push(car);
  return car;
}

/**
 * Drive from the car's current spot to `spot` at another facility (already reserved by
 * the caller). If no road route exists the car is simply moved there.
 */
export function startTrip(w: World, car: Car, toId: string, spot: number, purpose: CarPurpose, reserve = true) {
  const from = facilityById.get(car.facilityId)!;
  const to = facilityById.get(toId)!;
  releaseSpot(w, car.facilityId, car.spot, car.id);
  const route = planRoute([carDeparture(from, from.spots[car.spot])], [carArrival(to, to.spots[spot])]);
  car.facilityId = toId;
  car.spot = spot;
  car.purpose = purpose;
  if (reserve) spotsOf(w, toId)[spot] = car.id;
  if (!route) {
    car.state = 'parked';
    placeAt(car, to, spot);
    return;
  }
  car.path = new Path(route.points);
  car.stops = stopLinesFor(car.path, route.junctions);
  car.s = 0;
  car.speed = 0;
  car.state = 'driving';
}

export function carAgent(c: Car): Agent {
  const f = forward(c.heading);
  const half = CAR_LEN / 2;
  return {
    id: c.id,
    moving: c.state === 'driving',
    lead: { x: c.x + f.x * half, z: c.z + f.z * half },
    dir: f,
    look: Math.max(2.5, 2 + c.speed * 1.0),
    points: [
      { x: c.x + f.x * half, z: c.z + f.z * half },
      { x: c.x, z: c.z },
      { x: c.x - f.x * half, z: c.z - f.z * half },
    ],
    fwd: f,
  };
}

/** The last stretch of every trip is off-road (lot, driveway): crawl there. */
const offRoad = (car: Car) => car.path.length - car.s < 22;

export function updateCars(w: World, dt: number) {
  for (const car of w.cars) {
    if (car.state !== 'driving') continue;
    const yieldNow = mustYield(w, car, dt);
    const remaining = car.path.length - car.s;
    let target = yieldNow ? 0 : Math.min(offRoad(car) ? LOT_SPEED : CITY_SPEED, Math.sqrt(2 * BRAKE * remaining) + 0.3);
    target = Math.min(target, signalSpeedCap(w, car.stops, car.s + CAR_LEN / 2, car.speed, BRAKE));
    car.speed = car.speed < target ? Math.min(target, car.speed + ACCEL * dt) : Math.max(target, car.speed - BRAKE * 2 * dt);
    car.s = Math.min(car.path.length, car.s + car.speed * dt);
    const p: V2 = car.path.at(car.s);
    const d = car.path.dirAt(car.s);
    car.x = p.x;
    car.z = p.z;
    car.heading = Math.atan2(d.x, d.z);
    if (car.s >= car.path.length - 1e-3) {
      car.state = 'parked';
      car.speed = 0;
      placeAt(car, facilityById.get(car.facilityId)!, car.spot);
    }
  }
}

export function removeGoneCars(w: World) {
  if (!w.cars.some((c) => c.state === 'gone')) return;
  for (const c of w.cars) if (c.state === 'gone') releaseSpot(w, c.facilityId, c.spot, c.id);
  w.cars = w.cars.filter((c) => c.state !== 'gone');
}
