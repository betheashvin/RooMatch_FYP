import { lazy, Suspense, useEffect, useId, useState } from "react";

import { productImages } from "../lib/productMedia";
import type { Product } from "../types/api";
import { CatalogImage } from "./CatalogImage";

const ProductModelViewer = lazy(() => import("./ProductModelViewer"));

export function ProductMediaGallery({ product }: { product: Product }) {
  const [view, setView] = useState<"photos" | "model">("photos");
  const [photoIndex, setPhotoIndex] = useState(0);
  const unavailableId = useId();
  const photos = productImages(product);
  const selected = Math.min(photoIndex, Math.max(0, photos.length - 1));
  const hasModel = !!product.glb_url?.trim();
  const showModel = view === "model" && hasModel;

  useEffect(() => {
    if (showModel || photos.length < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey ||
        (event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable=true]"))) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      setPhotoIndex((current) => (current + step + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModel, photos.length]);

  function changePhoto(step: number) {
    setPhotoIndex((selected + step + photos.length) % photos.length);
  }

  return (
    <figure className="min-w-0">
      <div role="group" aria-label="Product views" className="mb-4 inline-flex gap-1 rounded-lg border border-[#d9cebe] bg-[#eee4d6] p-1">
        <button
          type="button"
          aria-pressed={!showModel}
          onClick={() => setView("photos")}
          className={`cursor-pointer rounded-md px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294536] ${!showModel ? "bg-[#294536] text-[#fffaf3]" : "text-[#52634f] hover:bg-[#e4d8c7]"}`}
        >
          Photos{photos.length > 1 ? ` (${photos.length})` : ""}
        </button>
        <button
          type="button"
          aria-pressed={showModel}
          aria-describedby={!hasModel ? unavailableId : undefined}
          disabled={!hasModel}
          onClick={() => setView("model")}
          className={`cursor-pointer rounded-md px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294536] disabled:cursor-default disabled:opacity-40 ${showModel ? "bg-[#294536] text-[#fffaf3]" : "text-[#52634f] enabled:hover:bg-[#e4d8c7]"}`}
        >
          3D View
        </button>
      </div>

      <div className="relative flex aspect-[10/11] items-center justify-center overflow-hidden rounded-xl border border-[#e5dacb] bg-[#eee4d6]">
        {showModel ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Suspense fallback={<p role="status" className="text-sm text-[#766b5d]">Loading 3D viewer…</p>}>
              <ProductModelViewer product={product} onPhotos={() => setView("photos")} />
            </Suspense>
          </div>
        ) : (
          <>
            <CatalogImage
              key={photos[selected] ?? "no-photo"}
              product={product}
              src={photos[selected] ?? null}
              alt={`${product.name}, photo ${selected + 1}`}
              loading="eager"
              className="h-full w-full object-contain p-5"
            />
            {photos.length > 1 && (
              <>
                <PhotoArrow direction="previous" onClick={() => changePhoto(-1)} />
                <PhotoArrow direction="next" onClick={() => changePhoto(1)} />
                <span className="absolute bottom-3 rounded-full bg-[#f8f3e9]/95 px-3 py-1 text-xs text-[#52634f]" aria-live="polite" aria-atomic="true">
                  Photo {selected + 1} of {photos.length}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {!showModel && photos.length > 1 && (
        <div aria-label="Product photos" className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {photos.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-label={`View product photo ${index + 1}`}
              aria-pressed={selected === index}
              onClick={() => setPhotoIndex(index)}
              className={`flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 bg-[#eee4d6] p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294536] sm:size-20 ${selected === index ? "border-[#294536]" : "border-transparent hover:border-[#b6a58e]"}`}
            >
              <CatalogImage product={product} src={url} alt={`${product.name}, thumbnail ${index + 1}`} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      {showModel && <figcaption className="mt-3 text-xs leading-relaxed text-[#766b5d]">Drag to rotate. Scroll or pinch to zoom.</figcaption>}
      {!hasModel && <figcaption id={unavailableId} className="mt-3 text-xs leading-relaxed text-[#766b5d]">A 3D model is not available for this product.</figcaption>}
    </figure>
  );
}

function PhotoArrow({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={direction === "previous" ? "Previous product photo" : "Next product photo"}
      onClick={onClick}
      className={`absolute top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#f8f3e9]/95 text-[#294536] shadow-sm hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294536] ${direction === "previous" ? "left-3" : "right-3"}`}
    >
      <svg className={direction === "next" ? "rotate-180" : ""} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
    </button>
  );
}
