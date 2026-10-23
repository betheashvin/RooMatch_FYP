import { useReducer } from "react";

import type {
  Category,
  Door,
  FitReport,
  Footprint,
  Layout,
  Placement,
  Product,
  Room,
} from "../types/api";

// A placed item as the editor sees it. We keep the whole Product (for the label,
// price and catalog id) plus a client-only `instanceId` so two copies of the
// same product can be selected/moved/deleted independently. When we talk to the
// API we boil this back down to the backend's { product_id, footprint }.
export interface EditorPlacement {
  instanceId: string;
  product: Product;
  footprint: Footprint;
}

export interface EditorState {
  room: Room;
  placements: EditorPlacement[];
  selectedId: string | null; // instanceId of the selected item, or null
  budgetPkr: number | null;
  fitReport: FitReport | null; // latest result from POST /api/validate
  category: Category | null; // catalog filter chip (null = all)
  query: string; // catalog search text
}

export type EditorAction =
  | { type: "setRoomSize"; width_cm: number; length_cm: number }
  | { type: "addProduct"; product: Product }
  | { type: "movePlacement"; instanceId: string; x: number; y: number }
  | { type: "rotatePlacement"; instanceId: string }
  | { type: "setRotation"; instanceId: string; rotation_deg: number }
  | { type: "deletePlacement"; instanceId: string }
  | { type: "select"; instanceId: string | null }
  | { type: "addDoor"; door: Door }
  | { type: "removeDoor"; id: string }
  | { type: "setBudget"; budgetPkr: number | null }
  | { type: "setFitReport"; fitReport: FitReport | null }
  | { type: "loadLayout"; layout: Layout; catalog: Product[] }
  | { type: "setCategory"; category: Category | null }
  | { type: "setQuery"; query: string }
  | { type: "reset" };

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

const initialRoom: Room = {
  id: "editor-room",
  name: "Living room",
  width_cm: 400,
  length_cm: 300,
  height_cm: null,
  doors: [],
  windows: [],
  fixed_items: [],
};

const initialState: EditorState = {
  room: initialRoom,
  placements: [],
  selectedId: null,
  budgetPkr: null,
  fitReport: null,
  category: null,
  query: "",
};

// Any change to the room or the items invalidates the last validation result,
// so we drop it — stale green/red badges are worse than none.
function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "setRoomSize": {
      const width_cm = clamp(action.width_cm, 100, 2000);
      const length_cm = clamp(action.length_cm, 100, 2000);
      return {
        ...state,
        room: { ...state.room, width_cm, length_cm },
        fitReport: null,
      };
    }

    case "addProduct": {
      const { product } = action;
      const footprint: Footprint = {
        center: { x: state.room.width_cm / 2, y: state.room.length_cm / 2 },
        width_cm: product.width_cm,
        depth_cm: product.depth_cm,
        rotation_deg: 0,
      };
      const instanceId = crypto.randomUUID();
      return {
        ...state,
        placements: [...state.placements, { instanceId, product, footprint }],
        selectedId: instanceId,
        fitReport: null,
      };
    }

    case "movePlacement": {
      const x = clamp(action.x, 0, state.room.width_cm);
      const y = clamp(action.y, 0, state.room.length_cm);
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.instanceId === action.instanceId
            ? { ...p, footprint: { ...p.footprint, center: { x, y } } }
            : p,
        ),
        fitReport: null,
      };
    }

    case "rotatePlacement": {
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.instanceId === action.instanceId
            ? {
                ...p,
                footprint: {
                  ...p.footprint,
                  rotation_deg: (p.footprint.rotation_deg + 90) % 360,
                },
              }
            : p,
        ),
        fitReport: null,
      };
    }

    case "setRotation": {
      const deg = ((action.rotation_deg % 360) + 360) % 360;
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.instanceId === action.instanceId
            ? { ...p, footprint: { ...p.footprint, rotation_deg: deg } }
            : p,
        ),
        fitReport: null,
      };
    }

    case "deletePlacement": {
      return {
        ...state,
        placements: state.placements.filter(
          (p) => p.instanceId !== action.instanceId,
        ),
        selectedId:
          state.selectedId === action.instanceId ? null : state.selectedId,
        fitReport: null,
      };
    }

    case "select":
      return { ...state, selectedId: action.instanceId };

    case "addDoor":
      return {
        ...state,
        room: { ...state.room, doors: [...state.room.doors, action.door] },
        fitReport: null,
      };

    case "removeDoor":
      return {
        ...state,
        room: {
          ...state.room,
          doors: state.room.doors.filter((d) => d.id !== action.id),
        },
        fitReport: null,
      };

    case "setBudget":
      return { ...state, budgetPkr: action.budgetPkr };

    case "setFitReport":
      return { ...state, fitReport: action.fitReport };

    case "setCategory":
      return { ...state, category: action.category };

    case "setQuery":
      return { ...state, query: action.query };

    case "reset":
      return initialState;

    case "loadLayout": {
      // The recommendation engine returns placements by product id; rebuild the
      // editor's richer placements against the catalog, and adopt the engine's
      // authoritative fit report instead of re-validating.
      const byId = new Map(action.catalog.map((p) => [p.id, p]));
      const placements: EditorPlacement[] = [];
      for (const pl of action.layout.placements) {
        const product = byId.get(pl.product_id);
        if (!product) continue; // catalog item missing — skip rather than crash
        placements.push({ instanceId: crypto.randomUUID(), product, footprint: pl.footprint });
      }
      return {
        ...state,
        placements,
        selectedId: null,
        budgetPkr: action.layout.budget_pkr ?? state.budgetPkr,
        fitReport: action.layout.fit_report ?? null,
      };
    }

    default: {
      const _never: never = action;
      return _never;
    }
  }
}

export function useEditor() {
  return useReducer(reducer, initialState);
}

// --- derived helpers -------------------------------------------------------

// Strip the editor-only fields back down to what POST /api/validate expects.
export function toApiPlacements(placements: EditorPlacement[]): Placement[] {
  return placements.map((p) => ({
    product_id: p.product.id,
    footprint: p.footprint,
  }));
}

export function totalPkr(placements: EditorPlacement[]): number {
  return placements.reduce((sum, p) => sum + p.product.price_pkr, 0);
}
