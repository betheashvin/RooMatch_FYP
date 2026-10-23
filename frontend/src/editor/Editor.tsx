import { lazy, Suspense, useEffect, useState } from "react";

import { api } from "../lib/api.ts";
import type { Layout, Product } from "../types/api";
import type { BackgroundState } from "./RoomCanvas";
import type { StudioMode } from "./StudioChrome";
// import { StudioChrome } from "./StudioChrome";
import { toApiPlacements, useEditor } from "./useEditor";
import { PAD } from "./scale";
// import { FLOOR_PRESETS } from "./floor";
// import { WALL_PRESETS } from "./wall";
import { FurniturePalette } from "./FurniturePalette";
import { RoomCanvas } from "./RoomCanvas";

export function Editor() {
  const [state, dispatch] = useEditor();
  const [bg, setBg] = useState<BackgroundState | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [mode, setMode] = useState<StudioMode>("manual");
  const [wallColor, setWallColor] = useState("#ece7e0");
  const [wallFinishId, setWallFinishId] = useState("paint");
  const [wallPhotoUrl, setWallPhotoUrl] = useState<string | null>(null);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [floorId, setFloorId] = useState("light-wood");
  const [validating, setValidating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    api
      .catalog()
      .then(setCatalog)
      .catch((e: unknown) => setCatalogError(String(e)));
  }, []);

  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3500);
    return () => clearTimeout(t);
  }, [note]);

  async function handleValidate() {
    setValidating(true);
    setApiError(null);
    try {
      // FINALIZE THE REPORT LAYOUT FIRST, v1 v2 & current show only room check
      const report = await api.validate({
        room: state.room,
        placements: toApiPlacements(state.placements),
      });
      dispatch({ type: "setFitReport", fitReport: report });
    } catch (e: unknown) {
      setApiError(
        `Validation failed: ${String(e)}. Is the backend running on port 8000?`,
      );
    } finally {
      setValidating(false);
    }
  }

  function handleLoadLayout(layout: Layout) {
    dispatch({ type: "loadLayout", layout, catalog });
    setMode("manual");
  }

  const handleReset = () => {
    dispatch({ type: "reset" });
    setBg(null);
    setNote("Studio Reset.");
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      {/* Call NavBar component with relevant fields/data 
    <StudioChrome mode={mode} onMode={setMode}/> */}
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 p-4 lg:flex-row lg:items-start">
        <aside className="lg:sticky lg:top-20 lg:w-72 lg:shrink-0 lg:self-start">
          <FurniturePalette
            products={catalog}
            error={catalogError}
            category={state.category}
            query={state.query}
            onCategory={(c) => dispatch({ type: "setCategory", category: c })}
            onQuery={(q) => dispatch({ type: "setQuery", query: q })}
            onAdd={(p) => dispatch({ type: "addProduct", product: p })}
          />
        </aside>

        <main className="min-w-0 flex-1">
          {mode === "recommend" ? (
            <></>
          ) : (
            <>
              <div className="mb-2 inline-flex rounded-lg border border-sand bg-cream-100 p-0.5 text-sm">
                {(["2d", "3d"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={
                      "rounded-md px-3 py-1 font-medium transition-colors" +
                      (viewMode === m
                        ? "bg-terracotta text-cream"
                        : "text-ink/60 hover:text-ink")
                    }
                  >
                    {m === "2d" ? "2D Floor Plan" : "3D View"}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-sand bg-cream-100 p-3 shadow-sm">
                {viewMode === "2d" ? (
                  <></>
                  // <RoomCanvas
                  //   room={state.room}
                  //   placements={state.placements}
                  //   selectedId={state.selectedId}
                  //   fitReport={state.fitReport}
                  //   bg={bg}
                  //   onSelect={(id) =>
                  //     dispatch({ type: "select", instanceId: id })
                  //   }
                  //   onMove={(id, x, y) =>
                  //     dispatch({ type: "movePlacment", instanceId: id, x, y })
                  //   }
                  //   onBgMove={(x, y) => setBg((b) => (b ? { ...b, x, y } : b))}
                  // />
                ) : (
                  <></>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
