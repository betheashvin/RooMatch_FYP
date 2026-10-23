// The single place the centimetre <-> pixel mapping lives.
//
// Room space is in centimetres with the origin at the top-left corner, +x to
// the right and +y downward. Konva pixels share that orientation, so the whole
// mapping is one uniform scale (px per cm) plus a fixed margin (PAD) that keeps
// the room off the very edge of the stage. Keeping this in one module means the
// canvas, drag handlers and overlays can never disagree about where a cm sits.

export const CANVAS_MAX_W = 1400; // px ceiling for the stage on very wide screens
export const CANVAS_MAX_H = 900;
export const PAD = 24; // px of blank margin around the room inside the stage

export interface Viewport {
  scale: number; // pixels per centimetre
  stageW: number; // full Konva stage size, room + 2*PAD
  stageH: number;
}

// Pick the largest uniform scale that fits the whole room inside the space the
// canvas column actually has. `availWidthPx` is measured from the DOM at runtime
// (so the room never overflows onto the side panels); height is capped so a very
// deep room stays on screen.
export function fitViewport(
  widthCm: number,
  lengthCm: number,
  availWidthPx: number,
  availHeightPx: number = CANVAS_MAX_H,
): Viewport {
  const w = Math.min(availWidthPx, CANVAS_MAX_W);
  const scale = Math.min(
    (w - 2 * PAD) / widthCm,
    (availHeightPx - 2 * PAD) / lengthCm,
  );
  return {
    scale,
    stageW: widthCm * scale + 2 * PAD,
    stageH: lengthCm * scale + 2 * PAD,
  };
}

// A length in cm -> a length in px (no margin).
export function lenToPx(cm: number, scale: number): number {
  return cm * scale;
}

// A position in cm (room space) -> a position in px (stage space).
export function posToPx(cm: number, scale: number): number {
  return PAD + cm * scale;
}

// A position in px (stage space) -> a position in cm (room space).
export function posToCm(px: number, scale: number): number {
  return (px - PAD) / scale;
}
