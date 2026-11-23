import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/authState";
import { readStudioDraft } from "../editor/studioDraft";
import { CatalogImage } from "../home/CatalogImage";
import { Footer } from "../home/Footer";
import { Navbar } from "../home/Navbar";
import { ProductDetailsDialog } from "../home/ProductDetailsDialog";
import { api } from "../lib/api";
import type { Product } from "../types/api";
import { CatalogIcon } from "./CatalogIcon";
import {
  AVAILABILITIES,
  availability,
  CATEGORY_FILTERS,
  CATEGORY_LABELS,
  filterCatalog,
  formatPrice,
  readNumber,
  SELLER_TYPES,
  sellerType,
} from "./catalog";
import "./CatalogPage.css";

const PAGE_SIZE = 8;
const FILTER_KEYS = [
  "q",
  "category",
  "minPrice",
  "maxPrice",
  "minSize",
  "maxSize",
  "seller",
  "availability",
];
type UpdateFilters = (
  values: Record<string, string | null>,
  resetPage?: boolean,
) => void;

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  // Keep typed values synchronous while React Router updates the shareable URL
  // in a transition. Controlling these inputs from the URL loses rapid keystrokes.
  const [queryDraft, setQueryDraft] = useState<string | null>(null);
  const [minimumSizeDraft, setMinimumSizeDraft] = useState<string | null>(null);
  const [maximumSizeDraft, setMaximumSizeDraft] = useState<string | null>(null);
  const query = queryDraft ?? params.get("q") ?? "";
  const minimumSize = minimumSizeDraft ?? params.get("minSize") ?? "";
  const maximumSize = maximumSizeDraft ?? params.get("maxSize") ?? "";
  const auth = useAuth();
  const draft = readStudioDraft(undefined, auth.user?.user_id ?? null);
  const studioPath = draft?.layoutId
    ? `/studio/${encodeURIComponent(draft.layoutId)}`
    : "/studio";

  useEffect(() => {
    const onPopState = () => {
      const source = new URLSearchParams(window.location.search);
      const active = document.activeElement?.id;
      setQueryDraft(
        active === "catalog-search" ? (source.get("q") ?? "") : null,
      );
      setMinimumSizeDraft(
        active === "catalog-min-size" ? (source.get("minSize") ?? "") : null,
      );
      setMaximumSizeDraft(
        active === "catalog-max-size" ? (source.get("maxSize") ?? "") : null,
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Furniture Catalog | RooMatch";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.catalog().then(
      (catalog) => {
        if (!cancelled) {
          setProducts(catalog);
          setLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [requestVersion]);

  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 150000 };
    const prices = products.map((product) => product.price_pkr);
    const min = Math.floor(Math.min(...prices) / 1000) * 1000;
    return {
      min,
      max: Math.max(min + 1000, Math.ceil(Math.max(...prices) / 1000) * 1000),
    };
  }, [products]);
  const minPrice = Math.max(
    priceBounds.min,
    Math.min(priceBounds.max, readNumber(params, "minPrice", priceBounds.min)),
  );
  const maxPrice = Math.max(
    minPrice,
    Math.min(priceBounds.max, readNumber(params, "maxPrice", priceBounds.max)),
  );
  const filtered = useMemo(
    () => filterCatalog(products, params, minPrice, maxPrice),
    [products, params, minPrice, maxPrice],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.max(
    1,
    Math.min(pageCount, Math.floor(readNumber(params, "page", 1))),
  );
  const visibleProducts = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const category = CATEGORY_FILTERS.some(
    (filter) => filter.value === params.get("category"),
  )
    ? params.get("category")!
    : "all";
  const activeFilters = FILTER_KEYS.filter((key) => params.has(key)).length;

  function updateFilters(
    values: Record<string, string | null>,
    resetPage = true,
  ) {
    const active = document.activeElement?.id;
    if ("q" in values)
      setQueryDraft(active === "catalog-search" ? (values.q ?? "") : null);
    if ("minSize" in values)
      setMinimumSizeDraft(
        active === "catalog-min-size" ? (values.minSize ?? "") : null,
      );
    if ("maxSize" in values)
      setMaximumSizeDraft(
        active === "catalog-max-size" ? (values.maxSize ?? "") : null,
      );
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(values)) {
          if (value === null || value === "") next.delete(key);
          else next.set(key, value);
        }
        if (resetPage) next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function clearFilters() {
    setQueryDraft(null);
    setMinimumSizeDraft(null);
    setMaximumSizeDraft(null);
    setParams({}, { replace: true });
  }

  function changePage(next: number) {
    updateFilters({ page: next === 1 ? null : String(next) }, false);
    document.getElementById("catalog-results")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }

  return (
    <div className="catalog-page" id="catalog-top">
      <a className="catalog-skip-link" href="#catalog-results">
        Skip to furniture
      </a>
      <div className="bg-forest-800">
        <Navbar planTo={studioPath} planLabel="Plan Living Room" />
      </div>

      <main className="catalog-shell">
        <section className="catalog-intro" aria-labelledby="catalog-title">
          <p className="catalog-eyebrow">The RooMatch Collection</p>
          <h1 id="catalog-title">Furniture that fits your space.</h1>
          <p className="catalog-description">
            Explore real furniture from Karachi sellers, with dimensions and
            prices you can plan around.
          </p>
          <div className="catalog-search" role="search">
            <CatalogIcon name="search" />
            <label htmlFor="catalog-search" className="sr-only">
              Search furniture
            </label>
            <input
              id="catalog-search"
              type="search"
              placeholder="Search sofas, tables, storage..."
              value={query}
              onBlur={() => setQueryDraft(null)}
              onChange={(event) =>
                updateFilters({ q: event.target.value || null })
              }
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => updateFilters({ q: null })}
              >
                <CatalogIcon name="close" />
              </button>
            )}
          </div>
        </section>

        <div className="catalog-toolbar">
          <div
            className="catalog-categories"
            role="group"
            aria-label="Furniture categories"
          >
            {CATEGORY_FILTERS.slice(0, 6).map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={category === filter.value}
                onClick={() =>
                  updateFilters({
                    category: filter.value === "all" ? null : filter.value,
                  })
                }
              >
                {filter.label}
              </button>
            ))}
            {products.some((product) =>
              CATEGORY_FILTERS.slice(6).some((filter) =>
                (filter.categories as string[]).includes(product.category),
              ),
            ) && (
              <select
                className="catalog-more-categories"
                aria-label="More furniture categories"
                value={
                  CATEGORY_FILTERS.slice(6).some(
                    (filter) => filter.value === category,
                  )
                    ? category
                    : ""
                }
                onChange={(event) =>
                  updateFilters({ category: event.target.value || null })
                }
              >
                <option value="">More</option>
                {CATEGORY_FILTERS.slice(6).map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="catalog-result-controls">
            <button
              type="button"
              className="catalog-filter-toggle"
              aria-expanded={filtersOpen}
              aria-controls="catalog-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <CatalogIcon name="filter" /> Filters
              {activeFilters ? ` (${activeFilters})` : ""}
            </button>
            <p
              className="catalog-count"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {loading
                ? "Loading collection..."
                : error
                  ? "Collection unavailable"
                  : activeFilters
                    ? `${filtered.length} of ${products.length} pieces`
                    : `${products.length} curated pieces`}
            </p>
            <label className="catalog-sort">
              <span className="sr-only">Sort furniture</span>
              <select
                value={params.get("sort") ?? "recommended"}
                onChange={(event) =>
                  updateFilters({
                    sort:
                      event.target.value === "recommended"
                        ? null
                        : event.target.value,
                  })
                }
              >
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="size-asc">Smallest footprint</option>
                <option value="name">Name: A to Z</option>
              </select>
              <CatalogIcon name="chevron" />
            </label>
          </div>
        </div>

        <div className="catalog-layout">
          <CatalogFilters
            products={products}
            params={params}
            priceBounds={priceBounds}
            minPrice={minPrice}
            maxPrice={maxPrice}
            minimumSize={minimumSize}
            maximumSize={maximumSize}
            onInputBlur={(field) =>
              field === "minSize"
                ? setMinimumSizeDraft(null)
                : setMaximumSizeDraft(null)
            }
            open={filtersOpen}
            active={activeFilters > 0}
            update={updateFilters}
            onClear={clearFilters}
          />
          <section
            id="catalog-results"
            className="catalog-results"
            aria-label="Furniture results"
            aria-busy={loading}
          >
            {loading ? (
              <div className="catalog-product-grid" aria-hidden="true">
                {Array.from({ length: PAGE_SIZE }, (_, index) => (
                  <div key={index} className="catalog-product-skeleton">
                    <div />
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="catalog-empty" role="alert">
                <CatalogIcon name="room" />
                <h2>We couldn't load the collection.</h2>
                <p>Please try again in a moment.</p>
                <button
                  type="button"
                  onClick={() => {
                    setError(false);
                    setLoading(true);
                    setRequestVersion((version) => version + 1);
                  }}
                >
                  Try again
                </button>
              </div>
            ) : !filtered.length ? (
              <div className="catalog-empty">
                <CatalogIcon name="search" />
                <h2>
                  {products.length
                    ? "No pieces match your filters."
                    : "The collection is on its way."}
                </h2>
                <p>
                  {products.length
                    ? "Try a wider price range or fewer filters."
                    : "No furniture is available yet. Check back soon."}
                </p>
                {activeFilters > 0 && (
                  <button type="button" onClick={clearFilters}>
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="catalog-product-grid">
                {visibleProducts.map((product) => (
                  <CatalogProductCard
                    key={product.id}
                    product={product}
                    studioPath={studioPath}
                    onView={setSelectedProduct}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="catalog-fit-banner">
          <div className="catalog-banner-art">
            <CatalogIcon name="ruler" />
          </div>
          <div>
            <h2>Choose by style. Check by dimensions.</h2>
            <p>
              Our room-fit validation helps you make sure every piece actually
              works in your space.
            </p>
          </div>
          <CatalogIcon name="plan" className="catalog-banner-plan" />
        </aside>

        {!loading && !error && pageCount > 1 && (
          <nav className="catalog-pagination" aria-label="Catalog pages">
            <button
              type="button"
              disabled={page === 1}
              aria-label="Previous page"
              onClick={() => changePage(page - 1)}
            >
              <CatalogIcon name="chevron" className="catalog-previous" />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  aria-label={`Page ${number}`}
                  aria-current={page === number ? "page" : undefined}
                  onClick={() => changePage(number)}
                >
                  {number}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page === pageCount}
              aria-label="Next page"
              onClick={() => changePage(page + 1)}
            >
              <CatalogIcon name="chevron" />
            </button>
          </nav>
        )}

        <aside className="catalog-room-banner">
          <div className="catalog-banner-art">
            <CatalogIcon name="room" />
          </div>
          <div>
            <h2>Found your pieces? Check how they fit.</h2>
            <p>
              Use our room planner to see your selected furniture in your actual
              space.
            </p>
          </div>
          <Link to={studioPath} className="catalog-plan-button">
            Plan My Living Room <CatalogIcon name="arrow" />
          </Link>
        </aside>
      </main>

      <Footer />

      {selectedProduct && (
        <ProductDetailsDialog
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

function CatalogFilters({
  products,
  params,
  priceBounds,
  minPrice,
  maxPrice,
  minimumSize,
  maximumSize,
  onInputBlur,
  open,
  active,
  update,
  onClear,
}: {
  products: Product[];
  params: URLSearchParams;
  priceBounds: { min: number; max: number };
  minPrice: number;
  maxPrice: number;
  minimumSize: string;
  maximumSize: string;
  onInputBlur: (field: "minSize" | "maxSize") => void;
  open: boolean;
  active: boolean;
  update: UpdateFilters;
  onClear: () => void;
}) {
  const priceSpan = priceBounds.max - priceBounds.min;
  const low = ((minPrice - priceBounds.min) / priceSpan) * 100;
  const high = ((maxPrice - priceBounds.min) / priceSpan) * 100;
  const sellers = (params.get("seller") ?? "").split(",").filter(Boolean);
  const hasSellerTypes = products.some((product) => sellerType(product));
  const hasAvailability = products.some((product) => availability(product));

  return (
    <aside
      id="catalog-filters"
      className="catalog-sidebar"
      data-open={open}
      aria-label="Filter furniture"
    >
      <div className="catalog-filters-heading">
        <h2>
          <CatalogIcon name="filter" /> Filters
        </h2>
        <button type="button" disabled={!active} onClick={onClear}>
          Clear all
        </button>
      </div>
      <fieldset className="catalog-filter-group" disabled={!products.length}>
        <legend>Price Range</legend>
        <div className="catalog-price-slider">
          <div className="catalog-price-track">
            <div style={{ left: `${low}%`, width: `${high - low}%` }} />
          </div>
          <input
            type="range"
            aria-label="Minimum price"
            min={priceBounds.min}
            max={priceBounds.max}
            step="1000"
            value={minPrice}
            aria-valuetext={formatPrice(minPrice)}
            style={{ zIndex: low > 90 ? 3 : 2 }}
            onChange={(event) => {
              const value = Math.min(Number(event.target.value), maxPrice);
              update({
                minPrice: value === priceBounds.min ? null : String(value),
              });
            }}
          />
          <input
            type="range"
            aria-label="Maximum price"
            min={priceBounds.min}
            max={priceBounds.max}
            step="1000"
            value={maxPrice}
            aria-valuetext={formatPrice(maxPrice)}
            onChange={(event) => {
              const value = Math.max(Number(event.target.value), minPrice);
              update({
                maxPrice: value === priceBounds.max ? null : String(value),
              });
            }}
          />
        </div>
        <div className="catalog-price-labels">
          <span>{formatPrice(minPrice)}</span>
          <span aria-hidden="true">–</span>
          <span>{formatPrice(maxPrice)}</span>
        </div>
      </fieldset>
      <fieldset className="catalog-filter-group" disabled={!products.length}>
        <legend>Width / Depth (cm)</legend>
        <div className="catalog-dimension-inputs">
          <input
            id="catalog-min-size"
            type="number"
            aria-label="Minimum width and depth in centimetres"
            placeholder="Min"
            min="0"
            step="1"
            value={minimumSize}
            onBlur={() => onInputBlur("minSize")}
            onChange={(event) =>
              update({ minSize: event.target.value || null })
            }
          />
          <span aria-hidden="true">–</span>
          <input
            id="catalog-max-size"
            type="number"
            aria-label="Maximum width and depth in centimetres"
            placeholder="Max"
            min="0"
            step="1"
            value={maximumSize}
            onBlur={() => onInputBlur("maxSize")}
            onChange={(event) =>
              update({ maxSize: event.target.value || null })
            }
          />
        </div>
        <p className="catalog-filter-note">Applies to both width and depth.</p>
      </fieldset>
      <fieldset
        className="catalog-filter-group"
        aria-describedby={!hasSellerTypes ? "catalog-seller-note" : undefined}
      >
        <legend>Seller Type</legend>
        {SELLER_TYPES.map((option) => (
          <label key={option.value} className="catalog-choice">
            <input
              type="checkbox"
              checked={sellers.includes(option.value)}
              disabled={
                !products.some(
                  (product) => sellerType(product) === option.value,
                )
              }
              onChange={(event) => {
                const selected = event.target.checked
                  ? [...sellers, option.value]
                  : sellers.filter((value) => value !== option.value);
                update({ seller: selected.join(",") || null });
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
        {!hasSellerTypes && (
          <p className="catalog-filter-note" id="catalog-seller-note">
            Seller types aren’t listed yet.
          </p>
        )}
      </fieldset>
      <fieldset
        className="catalog-filter-group"
        aria-describedby={!hasAvailability ? "catalog-stock-note" : undefined}
      >
        <legend>Availability</legend>
        {hasAvailability && (
          <label className="catalog-choice">
            <input
              type="radio"
              name="availability"
              checked={!params.get("availability")}
              onChange={() => update({ availability: null })}
            />
            <span>Any availability</span>
          </label>
        )}
        {AVAILABILITIES.map((option) => (
          <label key={option.value} className="catalog-choice">
            <input
              type="radio"
              name="availability"
              checked={params.get("availability") === option.value}
              disabled={
                !products.some(
                  (product) => availability(product) === option.value,
                )
              }
              onChange={() => update({ availability: option.value })}
            />
            <span>{option.label}</span>
          </label>
        ))}
        {!hasAvailability && (
          <p className="catalog-filter-note" id="catalog-stock-note">
            Contact the seller to confirm stock.
          </p>
        )}
      </fieldset>
    </aside>
  );
}

function CatalogProductCard({
  product,
  studioPath,
  onView,
}: {
  product: Product;
  studioPath: string;
  onView: (product: Product) => void;
}) {
  const city = product.seller.seller_location?.city;
  return (
    <article className="catalog-product" aria-label={product.name}>
      <div className="catalog-product-photo" data-category={product.category}>
        <CatalogImage product={product} className="catalog-product-image" />
      </div>
      <div className="catalog-product-body">
        <p className="catalog-product-category">
          {CATEGORY_LABELS[product.category]}
        </p>
        <h2>{product.name}</h2>
        <p className="catalog-product-dimensions">
          <span className="sr-only">Width × depth × height: </span>
          {product.width_cm} × {product.depth_cm} × {product.height_cm} cm
        </p>
        <p className="catalog-product-price">
          {formatPrice(product.price_pkr)}
        </p>
        <p className="catalog-product-seller" title={product.seller.name}>
          <CatalogIcon name="pin" />
          {typeof city === "string" && city.trim()
            ? `${city} seller`
            : product.seller.name}
        </p>
        <div className="catalog-product-actions">
          <button
            type="button"
            aria-label={`View details for ${product.name}`}
            aria-haspopup="dialog"
            onClick={() => onView(product)}
          >
            View details
          </button>
          <Link
            to={studioPath}
            state={{ tryProductId: product.id }}
            aria-label={`Add ${product.name} to room`}
          >
            <CatalogIcon name="plus" /> Add to room
          </Link>
        </div>
      </div>
    </article>
  );
}
