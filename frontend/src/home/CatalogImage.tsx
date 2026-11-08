import { useState } from "react";

import type { Product } from "../types/api";

export function CatalogImage({
  product,
  className = "h-full w-full object-contain p-4",
  loading = "lazy",
}: {
  product: Product;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (product.image && product.image !== failedUrl) {
    return (
      <img
        src={product.image}
        alt={product.name}
        loading={loading}
        className={className}
        onError={() => setFailedUrl(product.image ?? null)}
      />
    );
  }

  return <span className="text-xs text-ink/50">Image unavailable</span>;
}
