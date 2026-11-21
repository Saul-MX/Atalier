import { type MetadataRoute } from "next";

import { catalogHref } from "@/lib/catalog/filters";
import { publicEnv } from "@/lib/env/public";
import { getCategories, getSitemapProducts } from "@/server/catalog/queries";

/**
 * Solo páginas indexables: inicio, catálogo, categorías y fichas activas.
 * Búsquedas y filtros llevan noindex (ver catalogIndexing) y no se listan.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv("NEXT_PUBLIC_APP_URL");
  const url = (path: string) => new URL(path, base).toString();
  const [categories, products] = await Promise.all([
    getCategories(),
    getSitemapProducts(),
  ]);

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/catalogo"), changeFrequency: "daily", priority: 0.9 },
    ...categories.map((category) => ({
      url: url(catalogHref({ category: category.slug })),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: url(`/producto/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
