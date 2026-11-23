import type { Category, Product } from "../types/api";

export const CATEGORY_LABELS: Record<Category, string> = {
  sofa: "Sofas",
  loveseat: "Sofas",
  armchair: "Chairs",
  coffee_table: "Coffee Tables",
  side_table: "Side Tables",
  tv_console: "TV Units",
  bookshelf: "Storage",
  rug: "Rugs",
  lighting: "Lighting",
  ottoman: "Ottomans",
  curtain: "Curtains",
};

export const CATEGORY_FILTERS = [
  { value: "all", label: "All", categories: [] },
  { value: "sofas", label: "Sofas", categories: ["sofa", "loveseat"] },
  {
    value: "coffee-tables",
    label: "Coffee Tables",
    categories: ["coffee_table"],
  },
  { value: "tv-units", label: "TV Units", categories: ["tv_console"] },
  { value: "chairs", label: "Chairs", categories: ["armchair"] },
  { value: "storage", label: "Storage", categories: ["bookshelf"] },
  { value: "side-tables", label: "Side Tables", categories: ["side_table"] },
  { value: "rugs", label: "Rugs", categories: ["rug"] },
  { value: "lighting", label: "Lighting", categories: ["lighting"] },
  { value: "ottomans", label: "Ottomans", categories: ["ottoman"] },
  { value: "curtains", label: "Curtains", categories: ["curtain"] },
] satisfies { value: string; label: string; categories: Category[] }[];

export const SELLER_TYPES = [
  { value: "retailer", label: "Retailer" },
  { value: "carpenter", label: "Carpenter" },
];

export const AVAILABILITIES = [
  { value: "in_stock", label: "In Stock" },
  { value: "on_request", label: "Available on Request" },
];

export function formatPrice(price: number) {
  return `Rs. ${price.toLocaleString("en-PK")}`;
}

export function sellerType(product: Product) {
  const value = product.attributes?.seller_type?.trim().toLowerCase();
  return SELLER_TYPES.some((option) => option.value === value) ? value : undefined;
}

export function availability(product: Product) {
  const value = product.attributes?.availability?.trim().toLowerCase().replace(/[ -]+/g, "_");
  if (value === "in_stock") return "in_stock";
  if (value === "on_request" || value === "available_on_request") return "on_request";
  return undefined;
}

export function readNumber(params: URLSearchParams, key: string, fallback: number) {
  const value = params.get(key);
  if (!value?.trim()) return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

// Give the first page a cross-section of the collection, retaining the curated
// API order within each category and for the remaining pieces.
export function featuredOrder(products: Product[]) {
  const categories: Category[] = [
    "sofa", "sofa", "coffee_table", "tv_console",
    "armchair", "side_table", "armchair", "bookshelf",
  ];
  const selected = new Set<string>();
  const featured: Product[] = [];
  for (const category of categories) {
    const product = products.find((item) => item.category === category && !selected.has(item.id));
    if (product) {
      selected.add(product.id);
      featured.push(product);
    }
  }
  return [...featured, ...products.filter((product) => !selected.has(product.id))];
}

export function filterCatalog(products: Product[], params: URLSearchParams, minPrice: number, maxPrice: number) {
  const group = CATEGORY_FILTERS.find((filter) => filter.value === params.get("category"));
  const words = (params.get("q") ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const minSize = readNumber(params, "minSize", 0);
  const maxSize = readNumber(params, "maxSize", Infinity);
  const sellers = (params.get("seller") ?? "").split(",").filter(Boolean);
  const stock = params.get("availability");

  const filtered = featuredOrder(products).filter((product) => {
    if (group?.categories.length && !(group.categories as Category[]).includes(product.category)) return false;
    if (product.price_pkr < minPrice || product.price_pkr > maxPrice) return false;
    if (product.width_cm < minSize || product.depth_cm < minSize ||
      product.width_cm > maxSize || product.depth_cm > maxSize) return false;
    if (sellers.length && !sellers.includes(sellerType(product) ?? "")) return false;
    if (stock && availability(product) !== stock) return false;
    const text = [product.name, product.description, CATEGORY_LABELS[product.category],
      product.color, ...product.style_tags, product.seller.name].join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });

  switch (params.get("sort")) {
    case "price-asc": return filtered.sort((a, b) => a.price_pkr - b.price_pkr);
    case "price-desc": return filtered.sort((a, b) => b.price_pkr - a.price_pkr);
    case "size-asc": return filtered.sort((a, b) => a.width_cm * a.depth_cm - b.width_cm * b.depth_cm);
    case "name": return filtered.sort((a, b) => a.name.localeCompare(b.name));
    default: return filtered;
  }
}