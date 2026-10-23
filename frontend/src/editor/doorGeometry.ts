import type { Door, Room } from "../types/api";

// Client-side mirror of the backend door geometry (backend geometry_engine.py).
// The engine computes the swing as an axis-aligned quarter-disc; here we produce
// the same shape as a Konva <Arc> description so the canvas can *draw* it. This
// is purely for display — the backend remains the source of truth for pass/fail.

export interface DoorGeometry {
  // The opening itself: the wall segment the door occupies (cm).
  a: [number, number];
  b: [number, number];
  // The swing arc, described the way Konva's <Arc> wants it: a sector centred on
  // the hinge, starting at `rotationDeg` and sweeping `sweepDeg` clockwise.
  hinge: [number, number];
  radiusCm: number;
  rotationDeg: number;
  sweepDeg: number;
  swingsInward: boolean;
}

// Where the opening sits on each wall, plus the unit vector pointing into the
// room. Matches _door_opening() in the backend exactly.
function opening(
  room: Room,
  door: Door,
): { a: [number, number]; b: [number, number]; inward: [number, number] } {
  const { width_cm: W, length_cm: L } = room;
  const o = door.offset_cm;
  const w = door.width_cm;
  switch (door.wall) {
    case "north":
      return { a: [o, 0], b: [o + w, 0], inward: [0, 1] };
    case "south":
      return { a: [o, L], b: [o + w, L], inward: [0, -1] };
    case "west":
      return { a: [0, o], b: [0, o + w], inward: [1, 0] };
    case "east":
      return { a: [W, o], b: [W, o + w], inward: [-1, 0] };
    default: {
      // Exhaustiveness guard: if Wall ever grows a case, TS flags this.
      const _never: never = door.wall;
      throw new Error(`unhandled wall: ${_never as string}`);
    }
  }
}

const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

// Normalise an angle difference into (-180, 180].
function norm180(d: number): number {
  let x = d % 360;
  if (x > 180) x -= 360;
  if (x <= -180) x += 360;
  return x;
}

export function doorGeometry(room: Room, door: Door): DoorGeometry {
  const { a, b, inward } = opening(room, door);
  // The hinge is one end of the opening; the leaf swings from lying along the
  // wall (toward the other end) round to pointing straight into the room.
  const hinge = door.hinge_left ? a : b;
  const other = door.hinge_left ? b : a;
  const along: [number, number] = [
    sign(other[0] - hinge[0]),
    sign(other[1] - hinge[1]),
  ];

  // Konva angles: 0deg = +x, positive sweeps clockwise (toward +y, which is
  // down on screen). The swept quadrant lies between the "closed" direction
  // (along the wall) and the inward direction; they are always 90deg apart.
  const angleClosed = toDeg(Math.atan2(along[1], along[0]));
  const angleInward = toDeg(Math.atan2(inward[1], inward[0]));
  const delta = norm180(angleInward - angleClosed); // +/-90
  // Start at whichever boundary lets a positive (clockwise) 90deg sweep cover
  // the quadrant between the two directions.
  const rotationDeg = delta > 0 ? angleClosed : angleInward;

  return {
    a,
    b,
    hinge,
    radiusCm: door.width_cm,
    rotationDeg,
    sweepDeg: 90,
    swingsInward: door.swings_inward,
  };
}
