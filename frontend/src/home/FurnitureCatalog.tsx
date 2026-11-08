import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { Product } from "../types/api";
import { CatalogImage } from "./CatalogImage";
import { CatalogStatus } from "./CatalogStatus";
import { ProductDetailsDialog } from "./ProductDetailsDialog";

export function FurnitureCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
      (cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load furniture.");
          setLoading(false);
        }
      },
    );

    return () => { cancelled = true; };
  }, [requestVersion]);

  // Repeat small catalogs until each half fills the full viewport.
  const minimumCards = Math.ceil(viewportWidth / (viewportWidth >= 640 ? 310 : 280));
  const marqueeProducts = products.length
    ? Array.from({ length: Math.max(1, Math.ceil(minimumCards / products.length)) }, () => products).flat()
    : [];

  return (
    <section
      id="furniture"
      className="overflow-hidden border-t border-[#d8c2a5] bg-[#f5eee3] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#9a704b]">
          The RooMatch Collection
        </p>

        <h2 className="font-serif text-4xl font-semibold tracking-tight text-[#263b30] sm:text-5xl">
          Furniture you can actually buy.
        </h2>

        <p className="mt-3 max-w-2xl text-[#766b5d]">
          Real, locally available furniture with verified dimensions,
          designed to fit your space and your budget.
        </p>

        <CatalogStatus
          loading={loading}
          error={error}
          empty={products.length === 0}
          className="mt-8 py-8 text-center text-sm text-[#766b5d]"
        />
        {error && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                setRequestVersion((version) => version + 1);
              }}
              className="rounded-lg border border-[#c9ad8d] px-4 py-2 text-sm text-[#294536] hover:bg-[#eee0cd]"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {!loading && !error && products.length > 0 && (
        <div className="furniture-carousel mt-6 overflow-hidden py-4 motion-reduce:overflow-x-auto">
          <div
            className="furniture-marquee flex w-max"
            style={{ animationDuration: `${marqueeProducts.length * 8}s` }}
          >
            {[false, true].map((duplicate) => (
              <div
                key={duplicate ? "duplicate" : "original"}
                aria-hidden={duplicate || undefined}
                className={"flex shrink-0 gap-5 pr-5" + (duplicate ? " motion-reduce:hidden" : "")}
              >
                {marqueeProducts.map((product, index) => (
                  <ProductCard
                    key={`${product.id}-${index}`}
                    product={product}
                    duplicate={duplicate || index >= products.length}
                    onView={setSelectedProduct}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 px-6 text-center text-xs tracking-wide text-[#8b7c69]">
        Thoughtfully selected furniture. Real dimensions. Better-fitting spaces.
      </p>

      {selectedProduct && (
        <ProductDetailsDialog
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <style>{`
        .furniture-marquee {
          animation: furniture-marquee 32s linear infinite;
        }

        .furniture-carousel:hover .furniture-marquee,
        .furniture-carousel:focus-within .furniture-marquee {
          animation-play-state: paused;
        }

        @keyframes furniture-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .furniture-marquee {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}

function ProductCard({ product, duplicate, onView }: {
  product: Product;
  duplicate: boolean;
  onView: (product: Product) => void;
}) {
  return (
    <article
      aria-hidden={duplicate || undefined}
      className={"group w-[260px] shrink-0 overflow-hidden rounded-2xl border border-[#e4d6c4] bg-[#fffaf3] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#294536] hover:bg-[#294536] hover:shadow-xl sm:w-[290px]" + (duplicate ? " motion-reduce:hidden" : "")}
    >
      <div className="flex h-48 items-center justify-center bg-[#eee4d6]">
        <CatalogImage product={product} />
      </div>

      <div className="p-5">
        <h3 className="min-h-12 font-serif text-lg font-semibold leading-snug text-[#263b30] group-hover:text-[#F0A15A]">
          {product.name}
        </h3>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[#8b5e3c] group-hover:text-[#f5eee3]">
            Rs {product.price_pkr.toLocaleString("en-PK")}
          </span>

          <button
            type="button"
            tabIndex={duplicate ? -1 : undefined}
            aria-label={`View ${product.name}`}
            aria-haspopup="dialog"
            onClick={() => onView(product)}
            className="shrink-0 cursor-pointer rounded-lg border border-[#c9ad8d] px-3 py-2 text-xs font-medium text-[#294536] group-hover:text-[#F0A15A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a704b]"
          >
            View item <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </article>
  );
}
