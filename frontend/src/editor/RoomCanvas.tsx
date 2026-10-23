import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Arc, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";

import type { FitReport, Room } from "../types/api";
import { doorGeometry } from "./doorGeometry";
import { CANVAS_MAX_H, CANVAS_MAX_W, fitViewport, lenToPx, posToCm, posToPx } from "./scale";
import type { EditorPlacement } from "./useEditor";

// A traced-over floor plan / photo used only as a visual backdrop. It is not
// part of the room model the engine validates — purely a drawing aid.
export interface BackgroundState {
  img: HTMLImageElement;
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

interface RoomCanvasProps {
  room: Room;
  placements: EditorPlacement[];
  selectedId: string | null;
  fitReport: FitReport | null;
  bg: BackgroundState | null;
  onSelect: (instanceId: string | null) => void;
  onMove: (instanceId: string, x: number, y: number) => void;
  onBgMove: (x: number, y: number) => void;
}

const GRID_CM = 50;

// Load an <img> for a product's `image` URL. Returns undefined until it loads
// (or forever, if the file is missing) so the caller can fall back to a box.
function useHtmlImage(src: string | null | undefined): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement | undefined>(undefined);
  useEffect(() => {
    if (!src) {
      setImg(undefined);
      return;
    }
    const image = new window.Image();
    const onLoad = () => setImg(image);
    image.addEventListener("load", onLoad);
    image.src = src;
    return () => image.removeEventListener("load", onLoad);
  }, [src]);
  return img;
}

// One draggable piece of furniture: its footprint box, the product photo if we
// have one, a selection/offender border, and a name label when there's no photo.
function FurnitureNode({
  placement,
  scale,
  selected,
  bad,
  onSelect,
  onMove,
}: {
  placement: EditorPlacement;
  scale: number;
  selected: boolean;
  bad: boolean;
  onSelect: (instanceId: string) => void;
  onMove: (instanceId: string, x: number, y: number) => void;
}) {
  const f = placement.footprint;
  const w = lenToPx(f.width_cm, scale);
  const h = lenToPx(f.depth_cm, scale);
  const img = useHtmlImage(placement.product.image);
  const fill = bad ? "#f3c9b8" : selected ? "#f0c3ac" : "#f6ddcd";
  const stroke = bad ? "#a94f30" : selected ? "#c15f3c" : "#d8a487";

  return (
    <Group
      x={posToPx(f.center.x, scale)}
      y={posToPx(f.center.y, scale)}
      offsetX={w / 2}
      offsetY={h / 2}
      rotation={f.rotation_deg}
      draggable
      onMouseDown={() => onSelect(placement.instanceId)}
      onTap={() => onSelect(placement.instanceId)}
      onDragStart={() => onSelect(placement.instanceId)}
      onDragEnd={(e) =>
        onMove(placement.instanceId, posToCm(e.target.x(), scale), posToCm(e.target.y(), scale))
      }
    >
      <Rect width={w} height={h} fill={fill} cornerRadius={2} />
      {img && <KonvaImage image={img} width={w} height={h} listening={false} />}
      <Rect
        width={w}
        height={h}
        stroke={stroke}
        strokeWidth={selected ? 2 : 1}
        cornerRadius={2}
      />
      {!img && (
        <Text
          text={placement.product.name}
          width={w}
          height={h}
          align="center"
          verticalAlign="middle"
          fontSize={11}
          padding={2}
          fill="#0f0d0a"
          listening={false}
        />
      )}
    </Group>
  );
}

export function RoomCanvas({
  room,
  placements,
  selectedId,
  fitReport,
  bg,
  onSelect,
  onMove,
  onBgMove,
}: RoomCanvasProps) {
  // Measure the column we live in so the stage fits it instead of overflowing.
  const containerRef = useRef<HTMLDivElement>(null);
  const [availW, setAvailW] = useState(0);
  const [availH, setAvailH] = useState(CANVAS_MAX_H);
  useLayoutEffect(() => {
    const el = containerRef.current;
    const measure = () => {
      if (el) setAvailW(el.clientWidth);
      // Use the viewport height too, leaving room for the header + breathing space.
      setAvailH(Math.max(420, Math.min(CANVAS_MAX_H, window.innerHeight - 150)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scale, stageW, stageH } = fitViewport(
    room.width_cm,
    room.length_cm,
    availW || CANVAS_MAX_W,
    availH,
  );

  // Which placed items a failed rule named. The backend reports offenders by
  // product id inside each rule's `detail` string, so a substring match tints
  // every instance of an offending product red. Approximate but useful.
  const offenders = useMemo(() => {
    const set = new Set<string>();
    if (fitReport && !fitReport.valid) {
      for (const r of fitReport.rules) {
        if (!r.passed && r.detail) {
          for (const p of placements) {
            if (r.detail.includes(p.product.id)) set.add(p.instanceId);
          }
        }
      }
    }
    return set;
  }, [fitReport, placements]);

  const xs: number[] = [];
  for (let x = 0; x <= room.width_cm; x += GRID_CM) xs.push(x);
  const ys: number[] = [];
  for (let y = 0; y <= room.length_cm; y += GRID_CM) ys.push(y);

  // Click on empty canvas (anything not a furniture group) clears the selection.
  const handleStageMouseDown = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (e.target === e.target.getStage()) onSelect(null);
  };

  return (
    <div ref={containerRef} className="flex w-full justify-center">
      {availW > 0 && (
        <Stage
          width={stageW}
          height={stageH}
          onMouseDown={handleStageMouseDown}
          onTouchStart={handleStageMouseDown}
        >
          {/* Background: clean ground + optional traced image. */}
          <Layer listening={bg !== null}>
            <Rect x={0} y={0} width={stageW} height={stageH} fill="#fbf8f3" listening={false} />
            {bg && (
              <KonvaImage
                image={bg.img}
                x={bg.x}
                y={bg.y}
                scaleX={bg.scale}
                scaleY={bg.scale}
                opacity={bg.opacity}
                draggable
                onDragEnd={(e) => onBgMove(e.target.x(), e.target.y())}
              />
            )}
          </Layer>

          {/* Room: fill, grid, border, dimension labels, doors + swing arcs. */}
          <Layer listening={false}>
            {/* Transparent when a backdrop is loaded, so the traced image shows
                through and furniture sits on top of it. */}
            <Rect
              x={posToPx(0, scale)}
              y={posToPx(0, scale)}
              width={lenToPx(room.width_cm, scale)}
              height={lenToPx(room.length_cm, scale)}
              fill={bg ? undefined : "#fdfbf7"}
            />
            {xs.map((x) => (
              <Line
                key={`v${x}`}
                points={[posToPx(x, scale), posToPx(0, scale), posToPx(x, scale), posToPx(room.length_cm, scale)]}
                stroke="#ece3d4"
                strokeWidth={1}
              />
            ))}
            {ys.map((y) => (
              <Line
                key={`h${y}`}
                points={[posToPx(0, scale), posToPx(y, scale), posToPx(room.width_cm, scale), posToPx(y, scale)]}
                stroke="#ece3d4"
                strokeWidth={1}
              />
            ))}
            <Rect
              x={posToPx(0, scale)}
              y={posToPx(0, scale)}
              width={lenToPx(room.width_cm, scale)}
              height={lenToPx(room.length_cm, scale)}
              stroke="#3a332a"
              strokeWidth={2}
            />
            <Text
              x={posToPx(0, scale)}
              y={4}
              width={lenToPx(room.width_cm, scale)}
              align="center"
              text={`${room.width_cm} cm`}
              fontSize={12}
              fill="#8a7f6d"
            />
            <Text
              x={2}
              y={posToPx(room.length_cm / 2, scale) - 6}
              text={`${room.length_cm} cm`}
              fontSize={12}
              fill="#8a7f6d"
            />

            {room.doors.map((door) => {
              const g = doorGeometry(room, door);
              return (
                <Group key={door.id}>
                  {g.swingsInward && (
                    <Arc
                      x={posToPx(g.hinge[0], scale)}
                      y={posToPx(g.hinge[1], scale)}
                      innerRadius={0}
                      outerRadius={lenToPx(g.radiusCm, scale)}
                      angle={g.sweepDeg}
                      rotation={g.rotationDeg}
                      fill="rgba(245, 158, 11, 0.12)"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      dash={[4, 4]}
                    />
                  )}
                  <Line
                    points={[
                      posToPx(g.a[0], scale),
                      posToPx(g.a[1], scale),
                      posToPx(g.b[0], scale),
                      posToPx(g.b[1], scale),
                    ]}
                    stroke="#f59e0b"
                    strokeWidth={4}
                  />
                </Group>
              );
            })}
          </Layer>

          {/* Furniture: draggable groups rotated about their centre. */}
          <Layer>
            {placements.map((p) => (
              <FurnitureNode
                key={p.instanceId}
                placement={p}
                scale={scale}
                selected={p.instanceId === selectedId}
                bad={offenders.has(p.instanceId)}
                onSelect={onSelect}
                onMove={onMove}
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
