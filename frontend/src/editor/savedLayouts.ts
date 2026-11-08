import type { EditorPlacement, EditorState } from "./useEditor";
import type {
  LayoutAppearance,
  LayoutWrite,
  Product,
  Room,
  SavedLayout,
} from "../types/api";

export function toSavedLayout(
  state: Pick<EditorState, "room" | "placements" | "budgetPkr">,
  name: string,
  appearance: LayoutAppearance,
): LayoutWrite {
  return {
    name,
    room_width_cm: state.room.width_cm,
    room_length_cm: state.room.length_cm,
    door_window_config: {
      room_id: state.room.id,
      height_cm: state.room.height_cm ?? null,
      doors: state.room.doors,
      windows: state.room.windows,
    },
    budget_pkr: state.budgetPkr,
    appearance,
    items: [
      ...state.placements.map((p) => ({
        item_id: p.instanceId,
        product_id: p.custom ? null : p.product.id,
        x_position_cm: p.footprint.center.x,
        y_position_cm: p.footprint.center.y,
        rotation_deg: Math.round(p.footprint.rotation_deg) % 360,
        is_fixed: false,
        custom_dimensions: p.custom
          ? {
              width_cm: p.footprint.width_cm,
              depth_cm: p.footprint.depth_cm,
              height_cm: p.product.height_cm,
            }
          : null,
        label: p.custom ? p.product.name : null,
      })),
      ...state.room.fixed_items.map((p) => ({
        item_id: p.id,
        product_id: p.product_id ?? null,
        x_position_cm: p.footprint.center.x,
        y_position_cm: p.footprint.center.y,
        rotation_deg: Math.round(p.footprint.rotation_deg) % 360,
        is_fixed: true,
        custom_dimensions: p.product_id
          ? null
          : {
              width_cm: p.footprint.width_cm,
              depth_cm: p.footprint.depth_cm,
              height_cm: p.height_cm ?? null,
            },
        label: p.label,
      })),
    ],
  };
}

export function customProduct(
  id: string,
  label: string,
  width_cm: number,
  depth_cm: number,
  height_cm = 80,
): Product {
  return {
    id,
    name: label,
    category: "ottoman",
    price_pkr: 0,
    width_cm,
    depth_cm,
    height_cm,
    style_tags: [],
    attributes: { custom: "true" },
    seller: {
      seller_id: "00000000-0000-0000-0000-000000000000",
      name: "Owned / custom item",
    },
  };
}

export function fromSavedLayout(layout: SavedLayout): {
  room: Room;
  placements: EditorPlacement[];
} {
  const room: Room = {
    id: layout.door_window_config.room_id,
    name: layout.name,
    width_cm: layout.room_width_cm,
    length_cm: layout.room_length_cm,
    height_cm: layout.door_window_config.height_cm,
    doors: layout.door_window_config.doors,
    windows: layout.door_window_config.windows,
    fixed_items: [],
  };
  const placements: EditorPlacement[] = [];
  for (const item of layout.items) {
    const id = item.item_id!;
    const dimensions = item.product ?? item.custom_dimensions;
    if (!dimensions) throw new Error("Saved item dimensions are unavailable.");
    const footprint = {
      center: { x: item.x_position_cm, y: item.y_position_cm },
      width_cm: dimensions.width_cm,
      depth_cm: dimensions.depth_cm,
      rotation_deg: item.rotation_deg,
    };
    if (item.is_fixed)
      room.fixed_items.push({
        id,
        label: item.label || item.product?.name || "Owned item",
        footprint,
        height_cm: dimensions.height_cm,
        product_id: item.product_id,
      });
    else
      placements.push({
        instanceId: id,
        footprint,
        custom: item.product_id === null,
        product:
          item.product ??
          customProduct(
            id,
            item.label || "Custom item",
            dimensions.width_cm,
            dimensions.depth_cm,
            dimensions.height_cm ?? 80,
          ),
      });
  }
  return { room, placements };
}
