// The 3D counterpart to scale.ts. The 2D plan and the 3D scene render the SAME
// room + placement data; this module holds the single mapping from that data
// into three.js space, plus the colours used to tell pieces apart.
//
// Mapping: room space is top-down centimetres (origin top-left, +x right, +y
// "down"/away from you). three.js is Y-up, so we lay the room flat on the X-Z
// plane and use Y for height:
//     room x  ->  three x
//     room y  ->  three z
//     height  ->  three y  (up)
// Everything stays in centimetres — no unit conversion — so a 400 cm wall is
// 400 units long, matching the numbers typed in the editor.

import type {Category, Footprint} from "../types/api";
// Fallback ceiling height when the room doesn't specify one (cm). A typical
// living-room ceiling; only affects how tall the walls are drawn.

export const DEFAULT_ROOM_HEIGHT_CM = 270;
// Cosmetic thickness for the drawn floor slab and walls (cm).
export const SLAB_CM = 4;
export const WALL_CM = 6;

export interface Box3D{
    position: [number, number, number]; // centre: x, y (up), z
    size: [number, number, number]; // width (x), height (y), depth (z)
    rotationY: number; // rotation around Y axis (up) in radians
}
// Turn a footprint + its real height into a three.js box. The footprint centre
// is in room space (top-down); height/2 lifts the box so it rests on the floor.

export function footprintToBox(f:Footprint, heightCm: number): Box3D {
    return {
        position: [f.center.x, heightCm / 2, f.center.y],
        size:[f.width_cm,heightCm, f.depth_cm],
        // Negated: room-y maps to three-z, which flips the sense of a positive
    // (clockwise-in-2D) rotation. Calibrated by eye against the 2D plan.
    rotationY:(-f.rotation_deg * Math.PI)/180,
    };
}

export const CATEGORY_COLOR: Record<Category, string> = {
    sofa: "#6366f1",
    loveseat: "#8b5cf6",
    armchair: "#0ea5e9",
    coffee_table: "#f59e0b",
    side_table: "#fb923c",
    tv_console: "#14b8a6",
    bookshelf: "#a16207",
    rug: "#e11d48",
    lighting: "#eab308",
    ottoman: "#ec4899",
    curtain: "#a78bfa",
};


