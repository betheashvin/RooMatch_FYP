export type Category =
  | "sofa"
  | "loveseat"
  | "armchair"
  | "coffee_table"
  | "side_table"
  | "tv_console"
  | "bookshelf"
  | "rug"
  | "lighting"
  | "ottoman";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Seller {
  seller_id: string; // UUID serialized by the backend.
  name: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  website_url?: string | null;
  seller_location?: Record<string, JsonValue> | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category: Category;
  price_pkr: number;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  style_tags: string[];
  // Sub-type hints a footprint can't express, e.g. {"seats": "3"} or {"shape": "coffee"}.
  attributes?: Record<string, string>;
  color?: string | null;
  image?: string | null;
  glb_url?: string | null;
  listing_url?: string | null; // Product page; seller.website_url is the supplier site.
  seller: Seller;
  style_embedding?: number[] | null;
}

export interface Point {
  x: number;
  y: number;
}

export interface Footprint {
  center: Point;
  width_cm: number;
  depth_cm: number;
  rotation_deg: number;
}

export type Wall = "north" | "south" | "west" | "east";

export interface Door {
  id: string;
  wall: Wall;
  offset_cm: number;
  width_cm: number;
  swings_inward: boolean;
  hinge_left: boolean;
}

export interface WindowOpening {
  id: string;
  wall: Wall;
  offset_cm: number;
  width_cm: number;
  sill_height_cm?: number | null;
}

export interface FixedItem {
  id: string;
  label: string;
  footprint: Footprint;
}

export interface Room {
  id: string;
  name: string;
  width_cm: number;
  length_cm: number;
  height_cm?: number | null;
  doors: Door[];
  windows: WindowOpening[];
  fixed_items: FixedItem[];
}

export interface Placement {
  product_id: string;
  footprint: Footprint;
}

export interface RuleResult {
  rule: string;
  passed: boolean;
  detail?: string | null;
}

export interface FitReport {
  valid: boolean;
  rules: RuleResult[];
}

// Body for POST /api/validate.
export interface ValidateRequest {
  room: Room;
  placements: Placement[];
  min_clearance_cm?: number;
  door_clearance_cm?: number;
}

export interface Layout {
  room_id: string;
  placements: Placement[];
  total_price_pkr: number;
  budget_pkr?: number | null;
  within_budget?: boolean | null;
  fit_report?: FitReport | null;
}
