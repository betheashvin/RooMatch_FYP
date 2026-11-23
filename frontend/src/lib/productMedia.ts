import type { Product } from "../types/api";

export function productImages(product: Pick<Product, "image" | "images">): string[] {
  const urls = [product.image, ...(product.images ?? [])]
    .filter((url): url is string => typeof url === "string" && !!url.trim())
    .map((url) => url.trim());
  return [...new Set(urls)];
}
