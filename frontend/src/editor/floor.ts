// Floor materials for the 3D view. Each preset is drawn procedurally onto a
// small canvas (no image files, no downloads) and then tiled across the floor
// to the room's real size, so a 40 cm tile really is 40 cm on the plan.
//
// The canvas holds ONE repeat unit. We set the texture's repeat to
// roomSize / tileCm, so e.g. a 400 cm wall shows 10 tiles of a 40 cm preset.

export type FloorKind = "solid" | "wood" | "tile" | "carpet";

export interface FloorPreset {
  id: string;
  label: string;
  base: string; // main colour
  accent: string; // seam / grout / grain / speckle colour
  roughness: number; // 0 = glossy, 1 = matte (how the light reacts)
  kind: FloorKind;
  tileCm: number; // real-world size of one repeat unit, in cm
}

export const FLOOR_PRESETS: FloorPreset[] = [
  { id: "light-wood", label: "Light wood", base: "#d8b98f", accent: "#b28a5f", roughness: 0.75, kind: "wood", tileCm: 20 },
  { id: "dark-wood", label: "Dark wood", base: "#7a563a", accent: "#573a25", roughness: 0.7, kind: "wood", tileCm: 20 },
  { id: "tile", label: "Tile", base: "#e7e2da", accent: "#c3bbab", roughness: 0.35, kind: "tile", tileCm: 40 },
  { id: "carpet", label: "Carpet", base: "#c9bda4", accent: "#ad9f82", roughness: 1, kind: "carpet", tileCm: 50 },
  { id: "concrete", label: "Concrete", base: "#c2c0bb", accent: "#a3a19b", roughness: 0.9, kind: "solid", tileCm: 100 },
];

// Draw one repeat tile of the given material. Returns a canvas the caller wraps
// in a THREE.CanvasTexture. Browser-only (uses the DOM canvas), which is fine —
// this module is only ever imported by the 3D scene.
export function makeFloorCanvas(preset: FloorPreset): HTMLCanvasElement {
  const S = 256; // pixels per repeat unit
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Base fill for every material.
  ctx.fillStyle = preset.base;
  ctx.fillRect(0, 0, S, S);

  if (preset.kind === "wood") {
    // Seams at top and bottom edges -> horizontal planks once tiled, plus faint
    // grain streaks along the plank.
    ctx.strokeStyle = preset.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 1.5);
    ctx.lineTo(S, 1.5);
    ctx.moveTo(0, S - 1.5);
    ctx.lineTo(S, S - 1.5);
    ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const y = Math.random() * S;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y + (Math.random() * 6 - 3));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (preset.kind === "tile") {
    // A grout border on all four edges -> a clean grid when tiled.
    ctx.strokeStyle = preset.accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, S, S);
  } else if (preset.kind === "carpet") {
    // Dense fine speckle so it reads as woven fabric rather than flat paint.
    for (let i = 0; i < 3000; i++) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = Math.random() > 0.5 ? preset.accent : preset.base;
      ctx.fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else {
    // Concrete / solid: soft mottled blotches for a non-uniform surface.
    for (let i = 0; i < 1400; i++) {
      ctx.globalAlpha = Math.random() * 0.07;
      ctx.fillStyle = preset.accent;
      const r = Math.random() * 22 + 6;
      ctx.beginPath();
      ctx.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return canvas;
}
