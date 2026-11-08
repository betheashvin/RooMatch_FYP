import type { LayoutAppearance } from "../types/api";
import type { BackgroundState } from "./RoomCanvas";
import type { StudioMode } from "./StudioChrome";
import type { EditorState } from "./useEditor";

export const DEFAULT_APPEARANCE: LayoutAppearance = {
  wall_color: "#ece7e0",
  wall_finish_id: "paint",
  floor_id: "light-wood",
};

export type DraftIntent = "resume" | "save" | "saveAndNew";

export interface StudioDraft {
  version: 1;
  layoutId: string | null;
  ownerId: string | null;
  state: EditorState;
  name: string;
  appearance: LayoutAppearance;
  wallPhotoUrl: string | null;
  backdropUrl: string | null;
  background: (Omit<BackgroundState, "img"> & { src: string }) | null;
  mode: StudioMode;
  viewMode: "2d" | "3d";
  lastSaved: string;
  intent: DraftIntent;
}

const KEY = "roomatch:studio-draft";
let memoryDraft: StudioDraft | null = null;

// Keep an in-memory fallback for browsers that block storage or large photos
// that exceed the tab's storage quota. Auth navigation stays in the same app.
export function writeStudioDraft(draft: StudioDraft) {
  memoryDraft = draft;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(draft)); }
  catch { /* The in-memory draft still survives the sign-in flow. */ }
}

export function readStudioDraft(layoutId: string | null, ownerId: string | null): StudioDraft | null {
  try {
    const draft: StudioDraft | null = memoryDraft ?? JSON.parse(window.sessionStorage.getItem(KEY) || "null");
    if (!draft || draft.version !== 1 || draft.layoutId !== layoutId ||
      (layoutId && draft.ownerId !== ownerId) || !draft.state?.room ||
      !Array.isArray(draft.state.placements) || !draft.appearance ||
      typeof draft.name !== "string" || typeof draft.lastSaved !== "string" ||
      !["resume", "save", "saveAndNew"].includes(draft.intent)) return null;
    return draft;
  } catch { return null; }
}

export function clearStudioDraft() {
  memoryDraft = null;
  try { window.sessionStorage.removeItem(KEY); }
  catch { /* Storage may be unavailable. */ }
}
