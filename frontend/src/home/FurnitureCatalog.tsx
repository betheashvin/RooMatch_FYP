import { useState } from "react";

interface Product {
  name: string;
  dims: string;
  price: string;
  type: "sofa" | "table";
  fitCheck?: boolean;
  description: string;
  images: string[];
}

interface FurnitureCatalogProps {
  onPlanRoom: () => void;
}

const PRODUCTS: Product[] = [
  {
    name: "Korangi Sofa",
    dims: '84"W × 36"D × 33"H',
    price: "Rs 110,000",
    type: "sofa",
    description:
      "A comfortable sofa with a timeless silhouette and warm upholstery, designed to bring comfort and character to your living space.",
    images: [
      "/products/sofa-001.jpg",
      "/products/sofa-002.jpg",
      "/products/sofa-003.jpg",
    ],
  },
  {
    name: "Zaidana Compact",
    dims: '72"W × 34"D × 35"H',
    price: "Rs 74,000",
    type: "sofa",
    description:
      "A compact, versatile sofa that combines everyday comfort with a clean and understated design.",
    images: [
      "/products/sofa-003.jpg",
      "/products/sofa-004.jpg",
      "/products/sofa-005.jpg",
    ],
  },
  {
    name: "Aram Bagh Fluted Table",
    dims: '48"W × 24"D × 18"H',
    price: "Rs 22,300",
    type: "table",
    description:
      "A warm wooden table with refined detailing, suitable for a thoughtfully arranged living room.",
    images: [
      "/products/table-001.jpg",
      "/products/table-002.jpg",
      "/products/table-003.jpg",
    ],
  },
  {
    name: "Hardwood Nesting Tables",
    dims: '30"W × 20"D × 18"H',
    price: "Rs 18,500",
    type: "table",
    
    description:
      "Practical nesting tables that add useful surface space while keeping your room flexible and uncluttered.",
    images: [
      "/products/table-003.jpg",
      "/products/table-004.jpg",
      "/products/table-005.jpg",
    ],
  },
];
export function FurnitureCatalog({
  onPlanRoom,
}: FurnitureCatalogProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  function openProduct(product: Product) {
    setSelectedProduct(product);
    setActiveImage(0);
    setIsPaused(true);
  }

  function closeProduct() {
    setSelectedProduct(null);
    setActiveImage(0);
    setIsPaused(false);
  }

  function handleTryInStudio() {
    closeProduct();
    onPlanRoom();
  }

  return (
    <>
      <section
        id="furniture"
        className="overflow-hidden border-t border-[#d8c2a5] bg-[#f5eee3] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          {/* Section Heading */}
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#9a704b]">
                The RooMatch Collection
              </p>

              <h2 className="font-serif text-4xl font-semibold tracking-tight text-[#263b30] sm:text-5xl">
                Furniture you can actually buy.
              </h2>

              <p className="mt-3 max-w-2xl text-[#766b5d]">
                Real, locally available furniture selected for your space
                and your budget.
              </p>
            </div>

            {/* <a
              href="/collection"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#294536] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#3b6048]"
            >
              View Full Collection
              <span aria-hidden="true">→</span>
            </a> */}
          </div>

        
          <div
            className="relative mt-10"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => {
              if (!selectedProduct) {
                setIsPaused(false);
              }
            }}
          >
             {/* <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-[#f5eee3]/70 to-transparent sm:w-8" />

            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-[#f5eee3] to-transparent sm:w-8" />  */}

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
                  onView={() => openProduct(product)}
                />
              ))}
            </div>
          </div>

          <p className="mt-5 text-center text-xs tracking-wide text-[#8b7c69]">
            Thoughtfully selected furniture. Better-fitting spaces.
          </p>
        </div>

        <style>{`
          @keyframes furniture-marquee {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .furniture-marquee {
              animation: none !important;
            }
          }
        `}</style>
      </section>

      {/* Product Details Popup */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeProduct();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeProduct();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            className="relative my-auto grid w-full max-w-4xl overflow-hidden rounded-2xl bg-[#faf4e9] shadow-2xl md:grid-cols-2"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeProduct}
              aria-label="Close product details"
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl text-[#263b30] shadow-sm transition hover:bg-white"
            >
              ×
            </button>

            {/* Product Images */}
            <div className="bg-gradient-to-br from-[#eee0cd] to-[#e2c9aa] p-5 sm:p-7">
              <div className="flex h-64 items-center justify-center overflow-hidden rounded-xl sm:h-80">
                <img
                  src={selectedProduct.images[activeImage]}
                  alt={selectedProduct.name}
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Image Thumbnails */}
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {selectedProduct.images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={activeImage === index}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-[#fffaf3] transition ${
                      activeImage === index
                        ? "border-[#294536]"
                        : "border-[#d8c2a5]"
                    }`}
                  >
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Information */}
            <div className="flex flex-col justify-center p-7 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a704b]">
                {selectedProduct.type}
              </p>

              <h3
                id="product-modal-title"
                className="mt-3 pr-8 font-serif text-3xl font-semibold text-[#263b30] sm:text-4xl"
              >
                {selectedProduct.name}
              </h3>

              <p className="mt-4 text-2xl font-semibold text-[#8b5e3c]">
                {selectedProduct.price}
              </p>

              <p className="mt-5 leading-7 text-[#766b5d]">
                {selectedProduct.description}
              </p>

              {/* Dimensions */}
              <div className="mt-6 border-y border-[#d8c2a5] py-5">
                <h4 className="font-semibold text-[#263b30]">
                  Product Dimensions
                </h4>

                <p className="mt-2 text-sm text-[#766b5d]">
                  {selectedProduct.dims}
                </p>

                <p className="mt-2 text-xs leading-5 text-[#8b7c69]">
                  W = Width · D = Depth · H = Height
                </p>
              </div>

              {selectedProduct.fitCheck && (
                <p className="mt-4 text-sm font-medium text-[#294536]">
                  ✓ Fit Check available
                </p>
              )}

              {/* Try in Studio */}
              <button
                type="button"
                onClick={handleTryInStudio}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#294536] px-5 py-4 font-medium text-white transition hover:bg-[#3b6048]"
              >
                Try in Studio
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Furniture Card */

function ProductCard({
  product,
  onView,
}: {
  product: Product;
  onView: () => void;
}) {
  return (
    <article className="group w-[260px] shrink-0 overflow-hidden rounded-2xl border border-[#e4d6c4] bg-[#fffaf3] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-[290px]">
      {/* Product Image */}
      <button
        type="button"
        onClick={onView}
        aria-label={`View ${product.name} details`}
        className="relative flex h-48 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#eee0cd] to-[#e2c9aa]"
      >
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {product.fitCheck && (
          <span className="absolute right-3 top-3 rounded-full bg-[#294536] px-3 py-1.5 text-[10px] font-medium text-white">
            ✓ Fit Check
          </span>
        )}
      </button>

      {/* Product Name and Price */}
      <div className="p-5">
        <h3 className="truncate font-serif text-lg font-semibold text-[#263b30]">
          {product.name}
        </h3>

        <div className="mt-5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[#8b5e3c]">
            {product.price}
          </span>

          <button
            type="button"
            onClick={onView}
            className="shrink-0 rounded-lg border border-[#c9ad8d] px-3 py-2 text-xs font-medium text-[#294536] transition hover:bg-[#294536] hover:text-white"
          >
            View item →
          </button>
        </div>
      </div>
    </article>
  );
}