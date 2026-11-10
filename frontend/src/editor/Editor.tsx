import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import { useAuth } from "../auth/authState";
import type { Product } from "../types/api";
import { FurniturePalette } from "./FurniturePalette";
import { RoomCanvas } from "./RoomCanvas";
import type { BackgroundState } from "./RoomCanvas";
import { StudioChrome } from "./StudioChrome";
import type { StudioMode } from "./StudioChrome";
import { StudioDialog } from "./StudioDialog";
import { PAD } from "./scale";
import { Toolbar } from "./Toolbar";
import { initialEditorState, toApiPlacements, useEditor } from "./useEditor";
import { fromSavedLayout, toSavedLayout } from "./savedLayouts";
import { clearStudioDraft, DEFAULT_APPEARANCE, readStudioDraft, writeStudioDraft } from "./studioDraft.ts";
import type { DraftIntent, StudioDraft } from "./studioDraft.ts";


const EMPTY_LAYOUT = JSON.stringify(toSavedLayout(initialEditorState, initialEditorState.room.name, DEFAULT_APPEARANCE));

// The whole Studio: catalog rail on the left, the to-scale room canvas in the
// middle, and the inspector + fit status on the right. The catalog is owned here
// so both the palette and the recommendation engine can read from it.
export function Editor() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const [draft] = useState(() => readStudioDraft(layoutId ?? null, auth.user?.user_id ?? null));
  const loadedId = useRef<string | null>(draft ? layoutId ?? null : null);
  const draftBackground = useRef(draft?.background ?? null);
  const resumedDraft = useRef(false);
  const [state, dispatch] = useEditor(draft?.state);
  const [layoutName, setLayoutName] = useState(draft?.name ?? initialEditorState.room.name);
  const [loadingLayout, setLoadingLayout] = useState(Boolean(layoutId && !draft));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"auth" | "new" | null>(null);
  const [newAfterSave, setNewAfterSave] = useState(false);
  const [bg, setBg] = useState<BackgroundState | null>(null);
  const [restoringBackground, setRestoringBackground] = useState(Boolean(draft?.background));
  const [note, setNote] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">(draft?.viewMode ?? "2d");
  const [mode, setMode] = useState<StudioMode>(draft?.mode ?? "manual");
  const [wallColor, setWallColor] = useState(draft?.appearance.wall_color ?? DEFAULT_APPEARANCE.wall_color);
  const [wallFinishId, setWallFinishId] = useState(draft?.appearance.wall_finish_id ?? DEFAULT_APPEARANCE.wall_finish_id);
  const [wallPhotoUrl, setWallPhotoUrl] = useState<string | null>(draft?.wallPhotoUrl ?? null);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(draft?.backdropUrl ?? null);
  const [floorId, setFloorId] = useState(draft?.appearance.floor_id ?? DEFAULT_APPEARANCE.floor_id);
  const [validating, setValidating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const payload = toSavedLayout(state, layoutName, { wall_color: wallColor, wall_finish_id: wallFinishId === "photo" ? "paint" : wallFinishId, floor_id: floorId });
  const serialized = JSON.stringify(payload);
  const [lastSaved, setLastSaved] = useState(draft?.lastSaved ?? serialized);
  const dirty = serialized !== lastSaved;
  const hasPhotos = Boolean(bg || restoringBackground || wallPhotoUrl || backdropUrl);

  useEffect(() => {
    if (draft) clearStudioDraft();
    const background = draftBackground.current;
    if (!background) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled && draftBackground.current === background) {
        const { src: _src, ...position } = background;
        setBg({ img, ...position });
        draftBackground.current = null;
        setRestoringBackground(false);
      }
    };
    img.onerror = () => {
      if (!cancelled && draftBackground.current === background) {
        draftBackground.current = null;
        setRestoringBackground(false);
      }
    };
    img.src = background.src;
    return () => { cancelled = true; };
  }, [draft]);

  useEffect(() => {
    if (!layoutId || loadedId.current === layoutId) return;
    let cancelled = false;
    setLoadingLayout(true); setLoadError(null);
    api.layout(layoutId).then(layout => {
      if (cancelled) return;
      const restored = fromSavedLayout(layout);
      dispatch({ type: "restoreSaved", ...restored, budgetPkr: layout.budget_pkr });
      setLayoutName(layout.name);
      setWallColor(layout.appearance.wall_color);
      setWallFinishId(layout.appearance.wall_finish_id);
      setFloorId(layout.appearance.floor_id);
      setBg(null); setWallPhotoUrl(null); setBackdropUrl(null);
      draftBackground.current = null; setRestoringBackground(false);
      setMode("manual");
      loadedId.current = layoutId;
      const restoredState = { ...restored, budgetPkr: layout.budget_pkr };
      setLastSaved(JSON.stringify(toSavedLayout(restoredState, layout.name, layout.appearance)));
    }).catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : "Unable to open layout."); })
      .finally(() => { if (!cancelled) setLoadingLayout(false); });
    return () => { cancelled = true; };
  }, [layoutId, loadAttempt, dispatch]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty || hasPhotos) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, hasPhotos]);

  function snapshot(intent: DraftIntent): StudioDraft {
    const currentId = loadedId.current;
    return {
      version: 1, layoutId: currentId, ownerId: currentId ? auth.user?.user_id ?? null : null,
      state, name: layoutName, appearance: { wall_color: wallColor, wall_finish_id: wallFinishId, floor_id: floorId },
      wallPhotoUrl, backdropUrl,
      background: bg ? { src: bg.img.src, x: bg.x, y: bg.y, scale: bg.scale, opacity: bg.opacity } : draftBackground.current,
      mode, viewMode, lastSaved, intent,
    };
  }

  function goToAuth(path: "login" | "signup", intent: DraftIntent) {
    writeStudioDraft(snapshot(intent));
    const next = loadedId.current ? `/studio/${loadedId.current}` : "/studio";
    navigate(`/${path}?next=${encodeURIComponent(next)}`);
  }

  function startNewLayout() {
    clearStudioDraft();
    draftBackground.current = null;
    setRestoringBackground(false);
    loadedId.current = null;
    dispatch({ type: "reset" });
    setLayoutName(initialEditorState.room.name);
    setWallColor(DEFAULT_APPEARANCE.wall_color);
    setWallFinishId(DEFAULT_APPEARANCE.wall_finish_id);
    setFloorId(DEFAULT_APPEARANCE.floor_id);
    setBg(null); setWallPhotoUrl(null); setBackdropUrl(null);
    setMode("manual"); setViewMode("2d");
    setLastSaved(EMPTY_LAYOUT);
    setSaveError(null); setApiError(null); setDialog(null); setNewAfterSave(false);
    setNote("New layout started.");
    if (layoutId) navigate("/studio");
  }

  function handleNewLayout() {
    if (saving) return;
    setSaveError(null);
    if (dirty || hasPhotos) setDialog("new");
    else startNewLayout();
  }

  async function handleSave(startNew = false) {
    if (saving || auth.loading) return;
    setSaveError(null);
    if (!auth.user) {
      setNewAfterSave(startNew);
      setDialog("auth");
      return;
    }
    setSaving(true);
    // Navigation may still be finishing after a reset; use the active layout ID.
    const currentId = loadedId.current;
    // A session may expire during the request. Keep the draft before the auth
    // guard redirects so signing back in can resume the same save.
    writeStudioDraft(snapshot(startNew ? "saveAndNew" : "save"));
    try {
      const saved = currentId ? await api.updateLayout(currentId, payload) : await api.createLayout(payload);
      clearStudioDraft();
      setLastSaved(serialized);
      setNote("Layout saved. Find it in My layouts.");
      setDialog(null);
      loadedId.current = saved.layout_id;
      if (startNew) {
        startNewLayout();
        setNote("Layout saved. New layout started.");
      } else if (!currentId) navigate(`/studio/${saved.layout_id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setNewAfterSave(startNew);
        setDialog("auth");
        setSaveError("Your session expired. Sign in to save your layout.");
      } else {
        clearStudioDraft();
        setSaveError(e instanceof Error ? e.message : "Unable to save layout.");
      }
    }
    finally { setSaving(false); }
  }

  const resumeSave = useEffectEvent((startNew: boolean) => { void handleSave(startNew); });
  useEffect(() => {
    if (auth.loading || !draft || resumedDraft.current) return;
    resumedDraft.current = true;
    if (auth.user && draft.intent !== "resume") {
      queueMicrotask(() => resumeSave(draft.intent === "saveAndNew"));
    }
  }, [auth.loading, auth.user, draft]);

  // Catalog: fetched once, shared by the palette and the recommendation panel.
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  useEffect(() => {
    api
      .catalog()
      .then(setCatalog)
      .catch((e: unknown) => setCatalogError(String(e)));
  }, []);

  // Transient status line for Save / Help actions.
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3500);
    return () => clearTimeout(t);
  }, [note]);

  function handleUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        // Start the backdrop at a usable on-screen size (~640px wide) regardless
        // of the source resolution; the user then scales/drags it onto the room.
        const scale = img.naturalWidth > 0 ? 640 / img.naturalWidth : 1;
        setBg({ img, x: PAD, y: PAD, scale, opacity: 0.7 });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleValidate() {
    setValidating(true);
    setApiError(null);
    try {
      const report = await api.validate({
        room: state.room,
        placements: toApiPlacements(state.placements),
      });
      dispatch({ type: "setFitReport", fitReport: report });
    } catch (e: unknown) {
      setApiError(`Validation failed: ${String(e)}. Is the backend running on :8000?`);
    } finally {
      setValidating(false);
    }
  }

  if (loadingLayout || loadError) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center text-ink">
    <p role={loadError ? "alert" : "status"}>{loadError || "Opening your layout…"}</p>
    {loadError && <button className="rounded-lg bg-terracotta px-4 py-2 text-cream" onClick={() => setLoadAttempt(value => value + 1)}>Try again</button>}
    <Link to="/dashboard" className="text-terracotta underline">Back to My layouts</Link>
  </main>;

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <StudioChrome mode={mode} onMode={setMode} onSignIn={() => goToAuth("login", "resume")} />

      <div className="mx-auto flex w-full max-w-[1700px] flex-wrap items-center gap-4 px-4 pt-4">
        <label className="flex items-center gap-3 text-sm">Layout name<input disabled={saving} maxLength={120} value={layoutName} onChange={e => { setLayoutName(e.target.value); dispatch({ type: "setRoomName", name: e.target.value }); }} className="rounded-lg border border-sand bg-cream-100 px-3 py-2" /></label>
        <span className="text-xs text-ink/60" role="status">{saving ? "Saving…" : dirty ? "Unsaved changes" : layoutId ? "Saved layout" : "New layout"}</span>
        {!auth.user && !auth.loading && <p className="text-xs text-ink/60">Try Studio freely. Sign in when you're ready to save.</p>}
        {saveError && !dialog && <p role="alert" className="text-sm text-terracotta-600">{saveError}</p>}
      </div>

      <div inert={saving} className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 p-4 lg:flex-row lg:items-start">
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
              {/* Plan / 3D toggle. Editing happens in the 2D plan; 3D is a
                  read-only viewer for judging scale and feel. */}
              <div className="mb-2 inline-flex rounded-lg border border-sand bg-cream-100 p-0.5 text-sm">
                {(["2d", "3d"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={
                      "rounded-md px-3 py-1 font-medium transition-colors " +
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
                  <RoomCanvas
                    room={state.room}
                    placements={state.placements}
                    selectedId={state.selectedId}
                    fitReport={state.fitReport}
                    bg={bg}
                    onSelect={(id) => dispatch({ type: "select", instanceId: id })}
                    onMove={(id, x, y) =>
                      dispatch({ type: "movePlacement", instanceId: id, x, y })
                    }
                    onBgMove={(x, y) => setBg((b) => (b ? { ...b, x, y } : b))}
                  />
                ) :<></>}
              </div>
            </>
          )}
        </main>

        <aside className="lg:sticky lg:top-20 lg:w-80 lg:shrink-0 lg:self-start">
          <Toolbar
            state={state}
            dispatch={dispatch}
            bg={bg}
            onUploadImage={handleUpload}
            onClearImage={() => { draftBackground.current = null; setRestoringBackground(false); setBg(null); }}
            onBgOpacity={(v) => setBg((b) => (b ? { ...b, opacity: v } : b))}
            onBgScale={(v) => setBg((b) => (b ? { ...b, scale: v } : b))}
            onValidate={handleValidate}
            validating={validating}
            apiError={apiError}
            onSave={() => void handleSave()}
            saving={saving}
            accountLoading={auth.loading}
            onNewLayout={handleNewLayout}
            onHelp={() => setNote("Click a piece to add it, drag it on the plan, then Validate.")}
            note={note}
          />
        </aside>
      </div>

      {dialog && <StudioDialog key={dialog} title={dialog === "auth" ? "Sign in to save your layout" : "Save before starting a new layout?"}
        busy={saving} onClose={() => { setDialog(null); setNewAfterSave(false); }}>
        <p className="mt-3 text-sm text-ink/65">{dialog === "auth"
          ? "Sign in or create an account to keep this room in My layouts. Your draft will be waiting when you return."
          : "You have unsaved changes. Save your current layout before starting a new one, or discard these changes."}</p>
        {dialog === "new" && hasPhotos && <p className="mt-2 text-xs text-ink/60">Uploaded photos are temporary and will be cleared in a new layout.</p>}
        {saveError && <p role="alert" className="mt-3 text-sm text-terracotta-600">{saveError}</p>}
        <div className="mt-5 flex flex-col gap-2">
          {dialog === "auth" ? <>
            <button type="button" onClick={() => goToAuth("login", newAfterSave ? "saveAndNew" : "save")} className="rounded-lg bg-terracotta px-4 py-3 text-sm font-medium text-cream hover:bg-terracotta-600">Sign in</button>
            <button type="button" onClick={() => goToAuth("signup", newAfterSave ? "saveAndNew" : "save")} className="rounded-lg border border-sand px-4 py-3 text-sm font-medium hover:bg-sand/30">Create an account</button>
          </> : <>
            <button type="button" disabled={saving || auth.loading} onClick={() => void handleSave(true)} className="rounded-lg bg-terracotta px-4 py-3 text-sm font-medium text-cream hover:bg-terracotta-600 disabled:opacity-50">{saving ? "Saving…" : "Save and start new"}</button>
            <button type="button" disabled={saving} onClick={startNewLayout} className="rounded-lg border border-sand px-4 py-3 text-sm font-medium text-terracotta-600 hover:bg-sand/30 disabled:opacity-50">Discard and start new</button>
          </>}
          <button type="button" autoFocus disabled={saving} onClick={() => { setDialog(null); setNewAfterSave(false); }} className="rounded-lg px-4 py-2 text-sm text-ink/65 hover:text-ink disabled:opacity-50">Keep editing</button>
        </div>
      </StudioDialog>}
    </div>
  );
}
