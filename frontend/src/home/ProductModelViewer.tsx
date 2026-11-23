import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Component, Suspense, useId, useMemo, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import { Spherical, Vector3 } from "three";

import { fitFurnitureModel } from "../editor/model3d";
import type { Product } from "../types/api";
import "./ProductModelViewer.css";

const MODEL_ACTIONS = [
  { label: "Rotate model left", symbol: "↶", type: "rotate", value: -Math.PI / 8 },
  { label: "Rotate model right", symbol: "↷", type: "rotate", value: Math.PI / 8 },
  { label: "Zoom in", symbol: "+", type: "zoom", value: 0.8 },
  { label: "Zoom out", symbol: "−", type: "zoom", value: 1.25 },
] as const;

export default function ProductModelViewer({ product, onPhotos }: { product: Product; onPhotos: () => void }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [attempt, setAttempt] = useState(0);
  const helpId = useId();
  const longest = Math.max(product.width_cm, product.depth_cm, product.height_cm);
  const distance = longest * 1.4;
  const url = product.glb_url!.trim();

  function rotate(step: number) {
    const orbit = controls.current;
    if (!orbit) return;
    const offset = orbit.object.position.clone().sub(orbit.target);
    const spherical = new Spherical().setFromVector3(offset);
    spherical.theta += step;
    orbit.object.position.copy(orbit.target).add(new Vector3().setFromSpherical(spherical));
    orbit.update();
  }

  function zoom(factor: number) {
    const orbit = controls.current;
    if (!orbit) return;
    const offset = orbit.object.position.clone().sub(orbit.target);
    const length = Math.max(orbit.minDistance, Math.min(orbit.maxDistance, offset.length() * factor));
    orbit.object.position.copy(orbit.target).add(offset.setLength(length));
    orbit.update();
  }

  const failure = <ViewerNotice
    message="The 3D model couldn't load. You can still view the product photos."
    onPhotos={onPhotos}
    onRetry={() => { useGLTF.clear(url); setAttempt((current) => current + 1); }}
  />;

  return (
    <ViewerBoundary key={`${url}:${attempt}`} fallback={failure}>
      <div
        role="region"
        aria-label={`Interactive 3D model of ${product.name}`}
        aria-describedby={helpId}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === "ArrowLeft") rotate(-Math.PI / 8);
          else if (event.key === "ArrowRight") rotate(Math.PI / 8);
          else if (event.key === "ArrowUp") zoom(0.8);
          else if (event.key === "ArrowDown") zoom(1.25);
          else if (event.key.toLowerCase() === "r") controls.current?.reset();
          else return;
          event.preventDefault();
        }}
        className="relative h-full w-full outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-[#294536]"
      >
        <span id={helpId} className="sr-only">Drag to rotate and scroll or pinch to zoom. Arrow keys rotate and zoom; R resets the view.</span>
        <Canvas
          className="product-model-canvas"
          shadows
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ position: [distance * 0.8, distance * 0.65, distance], fov: 35, near: longest / 1000, far: longest * 50 }}
          gl={{ antialias: true }}
          fallback={<ViewerNotice message="Your browser couldn't open the 3D view. You can still view the product photos." onPhotos={onPhotos} />}
        >
          <ambientLight intensity={0.8} />
          <hemisphereLight args={["#fff9ed", "#8b8172", 1.2]} />
          <directionalLight
            position={[longest * 2, longest * 3, longest * 2]}
            intensity={2}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-longest}
            shadow-camera-right={longest}
            shadow-camera-top={longest}
            shadow-camera-bottom={-longest}
            shadow-camera-near={1}
            shadow-camera-far={longest * 10}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-longest * 2, longest, -longest]} intensity={0.7} />
          <Suspense fallback={<Html center><p role="status" className="whitespace-nowrap rounded-lg bg-[#f8f3e9]/95 px-4 py-3 text-sm text-[#766b5d]">Loading 3D model…</p></Html>}>
            <ProductModel product={product} url={url} />
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -product.height_cm / 2 - 0.1, 0]} receiveShadow>
            <planeGeometry args={[longest * 6, longest * 6]} />
            <shadowMaterial transparent opacity={0.18} />
          </mesh>
          <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08} rotateSpeed={0.65} zoomSpeed={0.8} minDistance={longest * 0.7} maxDistance={longest * 6} minPolarAngle={Math.PI * 0.06} maxPolarAngle={Math.PI * 0.49} />
        </Canvas>

        <div role="group" aria-label="3D model controls" className="absolute bottom-3 left-1/2 flex w-max -translate-x-1/2 items-center gap-1 rounded-lg border border-[#d9cebe] bg-[#f8f3e9]/95 p-1 shadow-sm">
          {MODEL_ACTIONS.map((action) => (
            <button key={action.label} type="button" aria-label={action.label} title={action.label} onClick={() => action.type === "rotate" ? rotate(action.value) : zoom(action.value)} className="flex size-8 cursor-pointer items-center justify-center rounded-md text-lg text-[#294536] hover:bg-[#e9ddcc] focus-visible:outline-2 focus-visible:outline-[#294536]">
              <span aria-hidden="true">{action.symbol}</span>
            </button>
          ))}
          <button type="button" onClick={() => controls.current?.reset()} className="cursor-pointer whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium text-[#294536] hover:bg-[#e9ddcc] focus-visible:outline-2 focus-visible:outline-[#294536]">Reset view</button>
        </div>
      </div>
    </ViewerBoundary>
  );
}

function ProductModel({ product, url }: { product: Product; url: string }) {
  const { scene } = useGLTF(url);
  const { width_cm, height_cm, depth_cm } = product;
  const object = useMemo(() => {
    const model = fitFurnitureModel(scene, [width_cm, height_cm, depth_cm]);
    model.traverse((part) => { part.castShadow = true; part.receiveShadow = true; });
    return model;
  }, [scene, width_cm, height_cm, depth_cm]);
  return <primitive object={object} dispose={null} />;
}

function ViewerNotice({ message, onPhotos, onRetry }: { message: string; onPhotos: () => void; onRetry?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-serif text-xl text-[#294536]">3D view unavailable</p>
      <p className="max-w-xs text-sm leading-relaxed text-[#766b5d]">{message}</p>
      <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold">
        {onRetry && <button type="button" onClick={onRetry} className="cursor-pointer rounded-lg border border-[#b6a58e] px-4 py-2 hover:bg-[#e4d8c7]">Try again</button>}
        <button type="button" onClick={onPhotos} className="cursor-pointer rounded-lg bg-[#294536] px-4 py-2 text-[#fffaf3] hover:bg-[#355941]">View photos</button>
      </div>
    </div>
  );
}

class ViewerBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
