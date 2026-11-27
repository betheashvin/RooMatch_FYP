import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Grid, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { JSX as ReactJSX } from "react";
import type { ReactNode } from "react";
import { CanvasTexture, ClampToEdgeWrapping, DoubleSide, Plane, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3 } from "three";
import type { Mesh, Texture } from "three";

import type { Door, Room } from "../types/api";
import {
  CATEGORY_COLOR,
  DEFAULT_ROOM_HEIGHT_CM,
  footprintToBox,
  SLAB_CM,
  WALL_CM,
} from "./scene3d";
import { FLOOR_PRESETS, makeFloorCanvas } from "./floor";
import { WALL_PRESETS, makeWallCanvas } from "./wall.ts";
import type { EditorPlacement } from "./useEditor";
import { fitFurnitureModel } from "./model3d";

// Restore the global JSX namespace expected by TypeScript when using React 19.
declare global {
  namespace JSX {
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

interface RoomScene3DProps {
  room: Room;
  placements: EditorPlacement[];
  selectedId: string | null;
  onSelect: (instanceId: string | null) => void;
  onMove: (instanceId: string, x: number, y: number) => void;
  wallColor: string;
  wallFinishId: string;
  wallPhotoUrl: string | null;
  floorId: string;
  backdropUrl: string | null;
}

// The fallback shape: a shaded box at the piece's true size. Shown until a real
// 3D model is provided for a product, or if that model fails to load.
function FurnitureBox({
  size,
  color,
  selected,
}: {
  size: [number, number, number];
  color: string;
  selected: boolean;
}) {
  return (
    <mesh>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={selected ? color : "#000000"}
        emissiveIntensity={selected ? 0.6 : 0}
        roughness={0.7}
        metalness={0.05}
      />
    </mesh>
  );
}

// A real 3D model (.glb). We scale it to exactly fill the piece's footprint —
// the same width x depth x height the 2D plan validated — and recentre it on the
// group origin so it rests on the floor. The scene is cloned per instance so two
// copies of the same product don't share (and fight over) one transform.
function GltfModel({ url, size }: { url: string; size: [number, number, number] }) {
  const { scene } = useGLTF(url);
  const [width, height, depth] = size;
  const object = useMemo(
    () => fitFurnitureModel(scene, [width, height, depth]),
    [scene, width, height, depth],
  );
  return <primitive object={object} />;
}

// If a product's model URL is set but the file is missing or won't parse, catch
// the error and show the box instead of blanking the whole scene.
class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// One piece of furniture: its real 3D model when the product has one, otherwise
// a shaded box at its true size. Pressing it selects it (shared with the 2D
// plan) and starts a drag; the selected piece shows its name. While any piece
// is mid-drag every piece drops its pointer handlers (`eventsEnabled` false) so
// the invisible floor plane below receives the drag uninterrupted.
// The y=0 floor as a maths plane (normal up). We intersect the cursor ray with
// it each move to get the room point under the cursor — reused across drags.
const FLOOR_PLANE = new Plane(new Vector3(0, 1, 0), 0);
const HIT = new Vector3();

function Furniture3D({
  placement,
  selected,
  onSelect,
  onMove,
  onDragChange,
}: {
  placement: EditorPlacement;
  selected: boolean;
  onSelect: (instanceId: string) => void;
  onMove: (instanceId: string, x: number, y: number) => void;
  onDragChange: (dragging: boolean) => void;
}) {
  const box = footprintToBox(placement.footprint, placement.product.height_cm);
  const color = CATEGORY_COLOR[placement.product.category];
  const glb = placement.product.glb_url;
  const dragging = useRef(false);

  // Pointer capture is the key: on press we tell the browser to route EVERY
  // subsequent move/up for this finger to this object, even when the cursor
  // leaves the mesh (which it does the instant you drag fast). Each move we
  // shoot the event's ray at the floor plane and feed the hit back as the new
  // room (x, y) — world (x, z) map straight to room (x, y). No extra meshes.
  const handlers = {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      dragging.current = true;
      onSelect(placement.instanceId);
      onDragChange(true);
      document.body.style.cursor = "grabbing";
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      if (!dragging.current) return;
      e.stopPropagation();
      if (e.ray.intersectPlane(FLOOR_PLANE, HIT)) {
        onMove(placement.instanceId, HIT.x, HIT.z);
      }
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      if (!dragging.current) return;
      e.stopPropagation();
      (e.target as Element).releasePointerCapture(e.pointerId);
      dragging.current = false;
      onDragChange(false);
      document.body.style.cursor = "grab";
    },
    onPointerOver: () => {
      if (!dragging.current) document.body.style.cursor = "grab";
    },
    onPointerOut: () => {
      if (!dragging.current) document.body.style.cursor = "";
    },
  };

  const fallback = <FurnitureBox size={box.size} color={color} selected={selected} />;

  return (
    <group position={box.position} rotation={[0, box.rotationY, 0]} {...handlers}>
      {glb ? (
        // Error boundary (missing/broken file) + Suspense (still loading) both
        // fall back to the box, so the scene always shows something.
        <ModelErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <GltfModel url={glb} size={box.size} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        fallback
      )}
      {selected && (
        <Html position={[0, box.size[1] / 2 + 6, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded bg-slate-900/85 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {placement.product.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// A flat amber marker on the floor showing where a door opens. Mirrors the 2D
// plan's door line; wall cut-outs are a later refinement.
function doorMarker(
  room: Room,
  door: Door,
): { position: [number, number, number]; size: [number, number, number] } {
  const reach = WALL_CM * 3; // how far the marker reaches into the room
  const c = door.offset_cm + door.width_cm / 2;
  switch (door.wall) {
    case "north":
      return { position: [c, 1, 0], size: [door.width_cm, 2, reach] };
    case "south":
      return { position: [c, 1, room.length_cm], size: [door.width_cm, 2, reach] };
    case "west":
      return { position: [0, 1, c], size: [reach, 2, door.width_cm] };
    case "east":
      return { position: [room.width_cm, 1, c], size: [reach, 2, door.width_cm] };
    default: {
      const _never: never = door.wall;
      throw new Error(`unknown wall: ${String(_never)}`);
    }
  }
}

// The room shell: four solid walls with a dollhouse cut-away so the two walls
// nearest the camera hide as you orbit (they'd otherwise block the view), while
// the far walls stay opaque to sit furniture against. No ceiling — you look in
// from above like a doll's house.
function Walls({
  W,
  L,
  ceiling,
  color,
  roughness,
  texNS,
  texWE,
}: {
  W: number;
  L: number;
  ceiling: number;
  color: string;
  roughness: number;
  texNS: Texture | null;
  texWE: Texture | null;
}) {
  const north = useRef<Mesh>(null);
  const south = useRef<Mesh>(null);
  const west = useRef<Mesh>(null);
  const east = useRef<Mesh>(null);
  const cx = W / 2;
  const cz = L / 2;

  useFrame(({ camera }) => {
    // Show a wall only when it's the FAR one on its axis (behind the room from
    // where the camera is), so whichever wall is nearest you stays open.
    if (north.current) north.current.visible = camera.position.z >= cz;
    if (south.current) south.current.visible = camera.position.z < cz;
    if (west.current) west.current.visible = camera.position.x >= cx;
    if (east.current) east.current.visible = camera.position.x < cx;
  });

  // north & south span the width (X, so they share texNS); west & east span the
  // length (Z, so they share texWE). A textured wall uses white as its base so
  // the texture shows true; a painted wall uses the picked colour and no map.
  return (
    <group>
      <mesh ref={north} position={[cx, ceiling / 2, 0]}>
        <boxGeometry args={[W, ceiling, WALL_CM]} />
        <meshStandardMaterial
          color={texNS ? "#ffffff" : color}
          map={texNS ?? undefined}
          roughness={roughness}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={south} position={[cx, ceiling / 2, L]}>
        <boxGeometry args={[W, ceiling, WALL_CM]} />
        <meshStandardMaterial
          color={texNS ? "#ffffff" : color}
          map={texNS ?? undefined}
          roughness={roughness}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={west} position={[0, ceiling / 2, cz]}>
        <boxGeometry args={[WALL_CM, ceiling, L]} />
        <meshStandardMaterial
          color={texWE ? "#ffffff" : color}
          map={texWE ?? undefined}
          roughness={roughness}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={east} position={[W, ceiling / 2, cz]}>
        <boxGeometry args={[WALL_CM, ceiling, L]} />
        <meshStandardMaterial
          color={texWE ? "#ffffff" : color}
          map={texWE ?? undefined}
          roughness={roughness}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

// A photo backdrop behind the room: set as the scene background so it fills the
// view from every orbit angle. Purely for context — judging new furniture next
// to the user's real surroundings — so it's a flat 2D image, not reconstructed
// geometry, and it doesn't gain depth as you orbit.
function Backdrop({ url }: { url: string | null }) {
  const { scene } = useThree();
  useEffect(() => {
    if (!url) {
      scene.background = null;
      return;
    }
    const tex = new TextureLoader().load(url);
    tex.colorSpace = SRGBColorSpace;
    scene.background = tex;
    return () => {
      scene.background = null;
      tex.dispose();
    };
  }, [url, scene]);
  return null;
}

export function RoomScene3D({
  room,
  placements,
  selectedId,
  onSelect,
  onMove,
  wallColor,
  wallFinishId,
  wallPhotoUrl,
  floorId,
  backdropUrl,
}: RoomScene3DProps) {
  const W = room.width_cm;
  const L = room.length_cm;
  const ceiling = room.height_cm ?? DEFAULT_ROOM_HEIGHT_CM;
  const maxDim = Math.max(W, L);
  const center: [number, number, number] = [W / 2, 0, L / 2];

  // Drag-to-arrange. Each piece captures the pointer and moves itself; the only
  // thing the scene needs to know is whether SOME piece is being dragged, so it
  // can lock the camera (OrbitControls) meanwhile. The piece reports that here.
  const [dragging, setDragging] = useState(false);
  // Safety net: never leave the cursor stuck if the view unmounts mid-drag.
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  // Floor surface from the chosen preset: a procedural wood/tile/carpet/concrete
  // texture, tiled to the room's real size so the pattern is to scale.
  const floorPreset = useMemo(
    () => FLOOR_PRESETS.find((p) => p.id === floorId) ?? FLOOR_PRESETS[0],
    [floorId],
  );
  const floorTexture = useMemo(() => {
    const tex = new CanvasTexture(makeFloorCanvas(floorPreset));
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [floorPreset]);
  floorTexture.repeat.set(
    Math.max(1, W / floorPreset.tileCm),
    Math.max(1, L / floorPreset.tileCm),
  );

  // Wall finish. "Paint" has no texture (walls just use wallColor); the others
  // get a procedural texture, tiled per wall to the room's real size. north &
  // south share the width (W); west & east share the length (L).
  const wallPreset = useMemo(
    () => WALL_PRESETS.find((p) => p.id === wallFinishId) ?? WALL_PRESETS[0],
    [wallFinishId],
  );
  const wallTex = useMemo(() => {
    if (wallPreset.kind === "paint") return null;
    const canvas = makeWallCanvas(wallPreset);
    const mk = (widthCm: number) => {
      const t = new CanvasTexture(canvas);
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
      t.repeat.set(
        Math.max(1, Math.round(widthCm / wallPreset.tileCm)),
        Math.max(1, Math.round(ceiling / wallPreset.tileCm)),
      );
      return t;
    };
    return { ns: mk(W), we: mk(L) };
  }, [wallPreset, W, L, ceiling]);

  // "Photo" finish: map an uploaded image onto the walls (one copy per wall, not
  // tiled). It loads async and appears when ready. If "photo" is selected but no
  // image is uploaded yet, we fall back to the paint/preset texture below.
  const wallPhotoTex = useMemo(() => {
    if (!wallPhotoUrl) return null;
    const t = new TextureLoader().load(wallPhotoUrl);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = ClampToEdgeWrapping;
    t.wrapT = ClampToEdgeWrapping;
    return t;
  }, [wallPhotoUrl]);
  const usingPhoto = wallFinishId === "photo" && wallPhotoTex !== null;
  const wallNS = usingPhoto ? wallPhotoTex : (wallTex?.ns ?? null);
  const wallWE = usingPhoto ? wallPhotoTex : (wallTex?.we ?? null);

  return (
    <div className="h-[70vh] w-full overflow-hidden rounded bg-slate-50">
      <Canvas
        dpr={[1, 2]}
        camera={{
          position: [W / 2, maxDim * 1.05, L + maxDim * 0.75],
          fov: 50,
          near: 1,
          far: maxDim * 12 + 2000,
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <ambientLight intensity={0.7} />
        <hemisphereLight args={["#ffffff", "#9ca3af", 0.5]} />
        <directionalLight position={[W * 0.3, ceiling * 2.5, -L * 0.2]} intensity={1.0} />

        <Backdrop url={backdropUrl} />

        {/* Floor slab: its top face sits at y = 0. */}
        <mesh position={[W / 2, -SLAB_CM / 2, L / 2]}>
          <boxGeometry args={[W, SLAB_CM, L]} />
          <meshStandardMaterial map={floorTexture} roughness={floorPreset.roughness} />
        </mesh>

        {/* Reference grid on the floor: 50 cm cells, 100 cm sections. */}
        <Grid
          position={[W / 2, 0.2, L / 2]}
          args={[W, L]}
          cellSize={50}
          cellThickness={0.6}
          cellColor="#e2e8f0"
          sectionSize={100}
          sectionThickness={1}
          sectionColor="#94a3b8"
          fadeDistance={maxDim * 6}
          fadeStrength={1}
          infiniteGrid={false}
        />

        <Walls
          W={W}
          L={L}
          ceiling={ceiling}
          color={wallColor}
          roughness={wallPreset.roughness}
          texNS={wallNS}
          texWE={wallWE}
        />

        {room.doors.map((door) => {
          const m = doorMarker(room, door);
          return (
            <mesh key={door.id} position={m.position}>
              <boxGeometry args={m.size} />
              <meshStandardMaterial color="#f59e0b" transparent opacity={0.55} />
            </mesh>
          );
        })}

        {room.windows.map(window => {
          const horizontal = window.wall === "north" || window.wall === "south";
          const position: [number, number, number] = [
            horizontal ? window.offset_cm + window.width_cm / 2 : window.wall === "east" ? W - WALL_CM : WALL_CM,
            (window.sill_height_cm ?? 90) + 45,
            horizontal ? window.wall === "south" ? L - WALL_CM : WALL_CM : window.offset_cm + window.width_cm / 2,
          ];
          return <mesh key={window.id} position={position}><boxGeometry args={horizontal ? [window.width_cm, 90, 2] : [2, 90, window.width_cm]} /><meshStandardMaterial color="#58909c" transparent opacity={0.6} /></mesh>;
        })}
        {room.fixed_items.map(item => {
          const box = footprintToBox(item.footprint, item.height_cm ?? 80);
          return <group key={item.id} position={box.position} rotation={[0, box.rotationY, 0]}>
            <FurnitureBox size={box.size} color="#4a5a40" selected={false} />
            <Html position={[0, box.size[1] / 2 + 6, 0]} center><span className="pointer-events-none whitespace-nowrap rounded bg-forest-800/90 px-2 py-1 text-xs text-cream">{item.label} · fixed</span></Html>
          </group>;
        })}

        {placements.map((p) => (
          <Furniture3D
            key={p.instanceId}
            placement={p}
            selected={p.instanceId === selectedId}
            onSelect={onSelect}
            onMove={onMove}
            onDragChange={setDragging}
          />
        ))}

        {/* Camera is locked while a piece is being dragged so orbiting doesn't
            fight the drag; re-enabled on release. */}
        <OrbitControls
          makeDefault
          enabled={!dragging}
          target={center}
          maxPolarAngle={Math.PI / 2.02}
        />
      </Canvas>
    </div>
  );
}
