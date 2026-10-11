import type { V2 } from '../../core/math';
import { roundCorners } from '../../core/path';
import { GATE, ROAD, YARD_DOCK_LANE_Z, YARD_EXIT_LANE_Z } from '../site/layout';
import { DOOR_Z, type DockDef } from '../warehouse/layout';

/** Rig geometry (metres). The cab pose is the fifth-wheel hitch; the trailer pose is its rear axle. */
export const HITCH_TO_AXLE = 7;
export const AXLE_TO_REAR = 2;
export const CAB_FRONT = 3.6;
export const TRAILER_FRONT = 1;

/** Radius of the reversing arc into a dock. */
const DOCK_TURN = 9;
/** Hitch stop point in front of each barrier, keeping the cab nose clear of it. */
const GATE_IN_STOP = GATE.z + CAB_FRONT + 1;
const GATE_OUT_STOP = GATE.z - CAB_FRONT - 1;
/** Trailer axle position when the rear bumper touches the dock wall. */
const DOCKED_AXLE_Z = DOOR_Z + 0.2 + AXLE_TO_REAR;

export const SPAWN_X = ROAD.maxX;
export const DESPAWN_X = ROAD.maxX + 15;

/** From the public road (coming from the east) to the inbound barrier. */
export const approachRoute = (): V2[] =>
  roundCorners(
    [
      { x: SPAWN_X, z: ROAD.westboundZ },
      { x: GATE.inX, z: ROAD.westboundZ },
      { x: GATE.inX, z: GATE_IN_STOP },
    ],
    6,
  );

/** Through the gate, along the dock lane, stopping past the dock ready to reverse. */
export const gateToDockRoute = (dock: DockDef): V2[] =>
  roundCorners(
    [
      { x: GATE.inX, z: GATE_IN_STOP },
      { x: GATE.inX, z: YARD_DOCK_LANE_Z },
      { x: dock.x - DOCK_TURN - HITCH_TO_AXLE, z: YARD_DOCK_LANE_Z },
    ],
    8,
  );

/** Trailer-first arc into the dock door. Starts where the trailer axle stopped. */
export const reverseRoute = (dock: DockDef): V2[] =>
  roundCorners(
    [
      { x: dock.x - DOCK_TURN, z: YARD_DOCK_LANE_Z },
      { x: dock.x, z: YARD_DOCK_LANE_Z },
      { x: dock.x, z: DOCKED_AXLE_Z },
    ],
    DOCK_TURN,
    16,
  );

/** Pull out of the dock, along the exit lane, to the outbound barrier. */
export const dockToGateRoute = (dock: DockDef): V2[] =>
  roundCorners(
    [
      { x: dock.x, z: DOCKED_AXLE_Z + HITCH_TO_AXLE },
      { x: dock.x, z: YARD_EXIT_LANE_Z },
      { x: GATE.outX, z: YARD_EXIT_LANE_Z },
      { x: GATE.outX, z: GATE_OUT_STOP },
    ],
    7,
  );

/** Out of the gate onto the eastbound lane and away. */
export const exitRoute = (): V2[] =>
  roundCorners(
    [
      { x: GATE.outX, z: GATE_OUT_STOP },
      { x: GATE.outX, z: ROAD.eastboundZ },
      { x: DESPAWN_X, z: ROAD.eastboundZ },
    ],
    6,
  );
