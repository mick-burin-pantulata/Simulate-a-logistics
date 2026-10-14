import type { V2 } from '../../core/math';
import { roundCorners } from '../../core/path';
import {
  BAY_CAB_Z,
  EAST_BAY_X,
  ENTRY_GATE,
  EXIT_GATE,
  PARK_EXIT_Z,
  WEST_BAY_ENTRY_Z,
  WEST_BAY_X,
  WEST_CROSS_X,
  YARD_DOCK_LANE_Z,
  YARD_EXIT_LANE_Z,
} from '../site/layout';
import { DOOR_Z, type DockDef } from '../warehouse/layout';
import { ROAD_NODES, type RouteGoal, type RouteStart } from '../roads/network';

/** Rig geometry (metres). The cab pose is the fifth-wheel hitch; the trailer pose is its rear axle. */
export const HITCH_TO_AXLE = 7;
export const AXLE_TO_REAR = 2;
export const CAB_FRONT = 3.6;
export const TRAILER_FRONT = 1;

/** Radius of the reversing arc into a dock. */
const DOCK_TURN = 9;
/** Hitch stop points in front of each barrier, keeping the cab nose clear of it. */
const GATE_IN_STOP = ENTRY_GATE.z + CAB_FRONT + 1;
const GATE_OUT_STOP = EXIT_GATE.z - CAB_FRONT - 1;
/** Trailer axle position when the rear bumper touches the dock wall. */
const DOCKED_AXLE_Z = DOOR_Z + 0.2 + AXLE_TO_REAR;

// ---- Joining the town road network --------------------------------------------

/** Trucks come from (and return to) the highway beyond the south edge of town. */
export const HIGHWAY_START: RouteStart = { edge: { from: 'HWX', to: 'HW' }, at: 0 };
export const HIGHWAY_GOAL: RouteGoal = { edge: { from: 'HW', to: 'HWX' }, at: 280 };

/**
 * Into the entry gate from the main road: a left turn when eastbound, or a right turn
 * across the road when westbound — whichever route is shorter.
 */
export const FACTORY_ENTRY: RouteGoal[] = [
  { edge: { from: 'S_W1', to: 'S_C' }, at: ENTRY_GATE.x - ROAD_NODES.S_W1.x, suffix: [{ x: ENTRY_GATE.x, z: GATE_IN_STOP }] },
  { edge: { from: 'S_C', to: 'S_W1' }, at: ROAD_NODES.S_C.x - ENTRY_GATE.x, suffix: [{ x: ENTRY_GATE.x, z: GATE_IN_STOP }] },
];

/** Out of the exit gate, turning either way onto the main road. */
export const FACTORY_EXIT: RouteStart[] = [
  { edge: { from: 'S_C', to: 'S_E1' }, at: EXIT_GATE.x - ROAD_NODES.S_C.x, prefix: [{ x: EXIT_GATE.x, z: GATE_OUT_STOP }] },
  { edge: { from: 'S_E1', to: 'S_C' }, at: ROAD_NODES.S_E1.x - EXIT_GATE.x, prefix: [{ x: EXIT_GATE.x, z: GATE_OUT_STOP }] },
];

/** Where a truck stops on the dock lane to begin reversing (it approaches heading east). */
const dockStop = (dock: DockDef): V2 => ({ x: dock.x + DOCK_TURN + HITCH_TO_AXLE, z: YARD_DOCK_LANE_Z });

/** Straight from the entry gate along the dock lane, past the door, ready to reverse. */
export const gateToDockRoute = (dock: DockDef): V2[] =>
  roundCorners([{ x: ENTRY_GATE.x, z: GATE_IN_STOP }, { x: ENTRY_GATE.x, z: YARD_DOCK_LANE_Z }, dockStop(dock)], 8);

/** From the entry gate into a west holding bay, parking nose-north. */
export const gateToBayRoute = (bay: number): V2[] =>
  roundCorners(
    [
      { x: ENTRY_GATE.x, z: GATE_IN_STOP },
      { x: ENTRY_GATE.x, z: WEST_BAY_ENTRY_Z },
      { x: WEST_BAY_X[bay], z: WEST_BAY_ENTRY_Z },
      { x: WEST_BAY_X[bay], z: BAY_CAB_Z },
    ],
    4,
  );

/** Pull forward out of a west bay, along the back road and down onto the dock lane. */
export const bayToDockRoute = (bay: number, dock: DockDef): V2[] =>
  roundCorners(
    [
      { x: WEST_BAY_X[bay], z: BAY_CAB_Z },
      { x: WEST_BAY_X[bay], z: PARK_EXIT_Z },
      { x: WEST_CROSS_X, z: PARK_EXIT_Z },
      { x: WEST_CROSS_X, z: YARD_DOCK_LANE_Z },
      dockStop(dock),
    ],
    6,
  );

/** Trailer-first arc into the dock door, swinging west. Starts where the trailer axle stopped. */
export const reverseRoute = (dock: DockDef): V2[] =>
  roundCorners(
    [
      { x: dock.x + DOCK_TURN, z: YARD_DOCK_LANE_Z },
      { x: dock.x, z: YARD_DOCK_LANE_Z },
      { x: dock.x, z: DOCKED_AXLE_Z },
    ],
    DOCK_TURN,
    16,
  );

const pullOut = (dock: DockDef): V2[] => [
  { x: dock.x, z: DOCKED_AXLE_Z + HITCH_TO_AXLE },
  { x: dock.x, z: YARD_EXIT_LANE_Z },
];

/** Pull out of the dock and along the exit lane into an east check-out bay (weigh + seal). */
export const dockToCheckoutRoute = (dock: DockDef, bay: number): V2[] =>
  roundCorners([...pullOut(dock), { x: EAST_BAY_X[bay], z: YARD_EXIT_LANE_Z }, { x: EAST_BAY_X[bay], z: BAY_CAB_Z }], 6);

/** Check-out bays full: straight along the exit lane to the exit gate. */
export const dockToGateRoute = (dock: DockDef): V2[] =>
  roundCorners([...pullOut(dock), { x: EXIT_GATE.x, z: YARD_EXIT_LANE_Z }, { x: EXIT_GATE.x, z: GATE_OUT_STOP }], 6);

/** From a check-out bay round the back of the east park to the exit gate. */
export const checkoutToGateRoute = (bay: number): V2[] =>
  roundCorners(
    [
      { x: EAST_BAY_X[bay], z: BAY_CAB_Z },
      { x: EAST_BAY_X[bay], z: PARK_EXIT_Z },
      { x: EXIT_GATE.x, z: PARK_EXIT_Z },
      { x: EXIT_GATE.x, z: GATE_OUT_STOP },
    ],
    5,
  );

