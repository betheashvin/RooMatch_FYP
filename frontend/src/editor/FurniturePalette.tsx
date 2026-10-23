import type { Category, Product } from "../types/api";

// Left rail: the database catalog, searchable and filtered by category. Clicking a
// product drops one copy into the room (the editor decides where — room centre).
// This is the same data the recommendation engine feeds from.

interface FurniturePaletteProps {
  products: Product[];
  error: string | null;
  category: Category | null;
  query: string;
  onCategory: (category: Category | null) => void;
  onQuery: (query: string) => void;
  onAdd: (product: Product) => void;
}

const CATEGORY_LABEL: Record<Category, string> = {
  sofa: "Sofas",
  loveseat: "Loveseats",
  armchair: "Armchairs",
  coffee_table: "Coffee tables",
  side_table: "Side tables",
  tv_console: "TV consoles",
  bookshelf: "Bookshelves",
  rug: "Rugs",
  lighting: "Lighting",
  ottoman: "Ottomans",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL) as Category[];

export function FurniturePalette({
  products,
  error,
  category,
  query,
  onCategory,
  onQuery,
  onAdd,
}: FurniturePaletteProps) {
  const q = query.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (category && p.category !== category) return false;
    if (!q) return true;
    return `${p.name} ${p.description ?? ""} ${p.category} ${p.style_tags.join(" ")}`
      .toLowerCase()
      .includes(q);
  });

  // Only offer chips for categories the catalog actually has stock in.
  const present = CATEGORY_ORDER.filter((c) => products.some((p) => p.category === c));

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-sand bg-cream-100 p-3 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
        Room / Furniture
      </h2>

      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search"
        className="rounded-lg border border-sand bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink/40 focus:border-terracotta focus:outline-none"
      />

      <div className="flex flex-wrap gap-1.5">
        <Chip active={category === null} onClick={() => onCategory(null)} label="All" />
        {present.map((c) => (
          <Chip
            key={c}
            active={category === c}
            onClick={() => onCategory(category === c ? null : c)}
            label={CATEGORY_LABEL[c]}
          />
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-terracotta/30 bg-terracotta/10 p-2 text-xs text-terracotta-600">
          Could not reach the API ({error}). Is the backend running on :8000?
        </p>
      )}

      <ul className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto pr-0.5">
        {visible.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onAdd(p)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-sand bg-white p-2 text-left transition hover:border-terracotta/50 hover:bg-terracotta/5"
            >
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-cream">
                {p.image && (
                  <img
                    src={p.image}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                {p.description && (
                  <span className="block line-clamp-2 text-xs text-ink/60">{p.description}</span>
                )}
                <span className="block text-xs text-ink/60">
                  {p.width_cm}×{p.depth_cm} cm · Rs {p.price_pkr.toLocaleString("en-PK")}
                </span>
                <span className="block text-[11px] uppercase tracking-wide text-ink/40">
                  {CATEGORY_LABEL[p.category]}
                </span>
              </span>
              <span className="shrink-0 rounded-md bg-terracotta px-2.5 py-1 text-xs font-semibold text-cream">
                + Add
              </span>
            </button>
          </li>
        ))}
        {visible.length === 0 && !error && (
          <li className="text-xs text-ink/40">
            {products.length === 0 ? "Loading catalog…" : "No pieces match that search."}
          </li>
        )}
      </ul>
    </section>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
        (active
          ? "border-terracotta bg-terracotta text-cream"
          : "border-sand bg-white text-ink/70 hover:border-terracotta/50")
      }
    >
      {label}
    </button>
  );
}
