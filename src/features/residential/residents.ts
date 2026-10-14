import { pick, rand } from '../../core/math';
import type { World } from '../../world/types';
import { HOMES, STAFF_LOTS, STORES, facilityById } from '../city/layout';
import { buyAt, storeOpen } from '../stores/stores';
import { hourOfDay, minutes } from '../time/clock';
import { createParkedCar, reserveSpot, startTrip, type Car } from '../traffic/cars';
import type { Worker } from '../workers/workers';

/**
 * Where people live and how they get about. Every factory employee has a home in the
 * residential district and drives to work; other households drive to the shops, and
 * those shopping trips are what sell the factory's product.
 */

/** Peak shopping trips per game hour across town (scaled by the demand setting). */
const SHOP_TRIPS_PER_HOUR = 14;

export function shopProfile(h: number) {
  if (!storeOpen(h)) return 0;
  if (h < 11) return 0.6;
  if (h < 14) return 1;
  if (h < 17) return 0.75;
  return 1.2; // after-work rush
}

const commuters = (w: World) => w.workers.filter((p) => p.role !== 'guard' && p.role !== 'driver');
const lotFor = (p: Worker) => STAFF_LOTS.find((l) => l.side === p.side)!;

/** Give every employee a home parking spot and a car (at work if they are on shift now). */
export function setupResidents(w: World) {
  const homeSpots = HOMES.flatMap((f) => f.spots.map((_, i) => ({ id: f.id, spot: i })));
  // Spread people across the district rather than filling one street first.
  homeSpots.sort(() => Math.random() - 0.5);
  commuters(w).forEach((p, i) => {
    const home = homeSpots[i % homeSpots.length];
    p.homeId = home.id;
    p.homeSpot = home.spot;
    if (i >= homeSpots.length) return; // more staff than parking: they ride with someone
    if (p.duty === 'onDuty') {
      const car = createParkedCar(w, p.id, home.id, home.spot, 'commute');
      const lot = lotFor(p);
      const spot = reserveSpot(w, lot.id, car.id);
      if (spot >= 0) {
        // Move the car to the staff lot without driving, keeping the home spot free.
        w.parking[home.id][home.spot] = null;
        car.facilityId = lot.id;
        car.spot = spot;
        const s = lot.spots[spot];
        car.x = s.x;
        car.z = s.z;
        car.heading = s.heading;
      }
      p.carId = car.id;
    } else {
      p.carId = createParkedCar(w, p.id, home.id, home.spot, 'home').id;
    }
  });
}

export const carOf = (w: World, p: Worker): Car | undefined =>
  p.carId === null ? undefined : w.cars.find((c) => c.id === p.carId);

/** Drive from home to the staff car park on this person's side. False if they can't. */
export function driveToWork(w: World, p: Worker): boolean {
  const car = carOf(w, p);
  if (!car || car.state !== 'parked') return false;
  const lot = lotFor(p);
  const spot = reserveSpot(w, lot.id, car.id);
  if (spot < 0) return false;
  startTrip(w, car, lot.id, spot, 'commute');
  return true;
}

export function driveHome(w: World, p: Worker): boolean {
  const car = carOf(w, p);
  if (!car || car.state !== 'parked' || p.homeId === null) return false;
  startTrip(w, car, p.homeId, p.homeSpot, 'home');
  return true;
}

/** Where a parked car is (for walking to it). */
export function carSpot(w: World, p: Worker) {
  const car = carOf(w, p);
  if (!car) return null;
  return facilityById.get(car.facilityId)!.spots[car.spot];
}

export function parkedAt(w: World, p: Worker, kind: 'staffLot' | 'home') {
  const car = carOf(w, p);
  if (!car || car.state !== 'parked') return false;
  const f = facilityById.get(car.facilityId)!;
  return kind === 'home' ? car.facilityId === p.homeId : f.kind === 'staffLot';
}

// ---- Household shopping trips -------------------------------------------------------

const storeWeights = STORES.map((s) => s.width);

function pickStore() {
  const total = storeWeights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < STORES.length; i++) {
    r -= storeWeights[i];
    if (r <= 0) return STORES[i];
  }
  return STORES[0];
}

export function updateShopping(w: World, dt: number) {
  const h = hourOfDay(w.time);
  const perHour = SHOP_TRIPS_PER_HOUR * w.settings.demand * shopProfile(h);
  if (perHour > 0 && Math.random() < (perHour * dt) / minutes(60)) {
    const home = pick(HOMES);
    const store = pickStore();
    // A household car pulls out of the home's driveway (not one of the staff cars).
    const car = createParkedCar(w, -1, home.id, 0, 'home', false);
    car.homeId = home.id;
    const spot = reserveSpot(w, store.id, car.id);
    if (spot < 0) car.state = 'gone';
    else {
      car.storeId = store.id;
      startTrip(w, car, store.id, spot, 'shop', false);
    }
  }

  for (const car of w.cars) {
    if (car.ownerId !== -1 || car.state !== 'parked') continue;
    if (car.purpose === 'shop') {
      // At the till: buy (or find the shelves empty), then browse a while.
      buyAt(w, car.storeId!);
      car.purpose = 'shopping';
      car.timer = minutes(rand(10, 25));
    } else if (car.purpose === 'shopping') {
      car.timer -= dt;
      if (car.timer <= 0) startTrip(w, car, car.homeId!, 0, 'home', false);
    } else if (car.purpose === 'home') {
      car.state = 'gone'; // back in the garage
    }
  }
}
