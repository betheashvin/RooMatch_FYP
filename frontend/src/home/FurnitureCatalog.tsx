
import { useState } from "react";

interface Product {
  name: string;
  dims: string;
  price: string;
  type: "sofa" | "table";
  fitCheck?: boolean;
}

const PRODUCTS: Product[] = [
  {
    name: "Korangi Sofa",
    dims: '84"W × 36"D × 33"H',
    price: "Rs 110,000",
    type: "sofa",
  },
  {
    name: "Zaidana Compact",
    dims: '72"W × 34"D × 35"H',
    price: "Rs 74,000",
    type: "sofa",
  },
  {
    name: "Aram Bagh Fluted Table",
    dims: '48"W × 24"D × 18"H',
    price: "Rs 22,300",
    type: "table",
  },
  {
    name: "Hardwood Nesting Tables",
    dims: '30"W x 20"D x 18"H',
    price: "Rs 18,500",
    type: "table",
    fitCheck: true,
  },
];

export function FurnitureCatalog() {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <section
      id="furniture"
      className="overflow-hidden border-t border-[#d8c2a5] bg-[#f5eee3] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
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
          </div>

          <a
            href="/collection"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#294536] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#3b6048]"
          >
            View Full Collection
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <div
          className="mt-6 overflow-hidden py-4 [--carousel-fade:2rem] sm:[--carousel-fade:4rem]"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black var(--carousel-fade), black calc(100% - var(--carousel-fade)), transparent)",
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="flex w-max gap-5 motion-reduce:animate-none"
            style={{
              animation: "furniture-marquee 32s linear infinite",
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            {[...PRODUCTS, ...PRODUCTS].map((product, index) => (
              <ProductCard
                key={`${product.name}-${index}`}
                product={product}
              />
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-xs tracking-wide text-[#8b7c69]">
          Thoughtfully selected furniture. Real dimensions. Better-fitting spaces.
        </p>
      </div>

      <style>{`
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

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group w-[260px] shrink-0 overflow-hidden rounded-2xl border border-[#e4d6c4] bg-[#fffaf3] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#294536] hover:bg-[#294536] hover:shadow-xl sm:w-[290px]">
      <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-[#eee0cd] to-[#e2c9aa]">
        <ProductThumb type={product.type} />

        {product.fitCheck && (
          <span className="absolute right-3 top-3 rounded-full bg-[#294536] px-3 py-1.5 text-[10px] font-medium text-white">
            ✓ Fit Check
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-serif text-lg font-semibold text-[#263b30] group-hover:text-[#F0A15A] ">
          {product.name}
        </h3>

        <p className="mt-2 text-xs text-[#887966]">{product.dims}</p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[#8b5e3c]">
            {product.price}
          </span>

          <span className="rounded-lg border border-[#c9ad8d] px-3 py-2 text-xs font-medium text-[#294536] group-hover:text-[#F0A15A]">
            View item →
          </span>
        </div>
      </div>
    </article>
  );
}

function ProductThumb({ type }: { type: "sofa" | "table" }) {
  if (type === "sofa") {
    return (
      <svg
        width="160"
        height="110"
        viewBox="0 0 160 110"
        fill="none"
        aria-hidden="true"
      >
        <ellipse cx="80" cy="91" rx="57" ry="7" fill="#b9a087" opacity=".4" />
        <rect x="25" y="39" width="110" height="40" rx="10" fill="#a98060" />
        <rect x="25" y="31" width="110" height="21" rx="9" fill="#c5a486" />
        <rect x="17" y="47" width="16" height="34" rx="6" fill="#8e674b" />
        <rect x="127" y="47" width="16" height="34" rx="6" fill="#8e674b" />
        <path d="M80 36V77" stroke="#9c7657" strokeWidth="2" />
        <path d="M37 83V91M123 83V91" stroke="#72523c" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      width="150"
      height="110"
      viewBox="0 0 150 110"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="75" cy="91" rx="47" ry="6" fill="#b9a087" opacity=".4" />
      <path d="M42 52L35 88M108 52L115 88" stroke="#795538" strokeWidth="5" strokeLinecap="round" />
      <path d="M54 57L49 88M96 57L101 88" stroke="#9a704b" strokeWidth="4" strokeLinecap="round" />
      <rect x="27" y="36" width="96" height="23" rx="4" fill="#bd9068" />
      <path d="M35 41H115M35 47H115M35 53H115" stroke="#a87952" strokeWidth="1.5" />
    </svg>
  );
}
