// Wall finishes for the 3D view — the wall counterpart to floor.ts. Same idea:
// draw one repeat unit procedurally onto a canvas (no image files), then tile it
// across each wall to the room's real size.
//
// "Paint" is special: it has no texture, it just uses the colour picked in the
// toolbar. The rest carry their own look and ignore the paint colour.

export type WallKind = "paint" | "brick" | "wallpaper" | "plaster";

export interface WallPreset {
  id: string;
  label: string;
  base: string; // main colour
  accent: string; // mortar / stripe / mottle colour
  roughness: number;
  kind: WallKind;
  tileCm: number; // real-world size of one repeat unit, in cm
}

export const WALL_PRESETS: WallPreset[] = [
  { id: "paint", label: "Paint", base: "#ece7e0", accent: "#ece7e0", roughness: 0.95, kind: "paint", tileCm: 100 },
  { id: "brick", label: "Brick", base: "#b06a4f", accent: "#7f4a35", roughness: 0.9, kind: "brick", tileCm: 60 },
  { id: "wallpaper", label: "Wallpaper", base: "#e9e3d6", accent: "#c9bda0", roughness: 0.85, kind: "wallpaper", tileCm: 50 },
  { id: "plaster", label: "Plaster", base: "#e7e2d9", accent: "#cec6b6", roughness: 0.95, kind: "plaster", tileCm: 120 },
];

// Draw one repeat tile of the given wall finish. Browser-only (DOM canvas),
// which is fine — only the 3D scene imports this.
export function makeWallCanvas(preset: WallPreset): HTMLCanvasElement {
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  if (preset.kind === "brick") {
    // Mortar background, then offset rows of bricks (every other row shifted
    // half a brick) — the classic running-bond pattern.
    ctx.fillStyle = preset.accent;
    ctx.fillRect(0, 0, S, S);
    const bh = 36;
    const bw = 64;
    const gap = 5;
    let row = 0;
    for (let y = 0; y < S; y += bh, row++) {
      const off = row % 2 ? -bw / 2 : 0;
      for (let x = off; x < S; x += bw) {
        ctx.fillStyle = preset.base;
        ctx.fillRect(x + gap / 2, y + gap / 2, bw - gap, bh - gap);
        // A touch of per-brick shading so they don't look identical.
        ctx.globalAlpha = Math.random() * 0.12;
        ctx.fillStyle = "#000000";
        ctx.fillRect(x + gap / 2, y + gap / 2, bw - gap, bh - gap);
        ctx.globalAlpha = 1;
      }
    }
  } else if (preset.kind === "wallpaper") {
    // Base colour with faint vertical stripes.
    ctx.fillStyle = preset.base;
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = preset.accent;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 3;
    for (let x = 16; x < S; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (preset.kind === "plaster") {
    // Base colour with soft mottling.
    ctx.fillStyle = preset.base;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 1200; i++) {
      ctx.globalAlpha = Math.random() * 0.06;
      ctx.fillStyle = preset.accent;
      const r = Math.random() * 22 + 5;
      ctx.beginPath();
      ctx.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // Paint: flat fill (not actually used — paint walls use the colour prop).
    ctx.fillStyle = preset.base;
    ctx.fillRect(0, 0, S, S);
  }

  return canvas;
}
