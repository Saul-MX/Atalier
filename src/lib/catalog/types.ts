import { type VariantOption } from "./variants";

/** DTOs del catálogo: objetos planos y serializables (precios en centavos). */

export type ColorSwatch = { name: string; hex: string | null };

export type CategorySummary = { name: string; slug: string };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: CategorySummary;
  /** Foto de la tarjeta (la principal, o la del color filtrado). */
  images: string[];
  colors: ColorSwatch[];
  inStock: boolean;
};

export type ProductDetailData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category: CategorySummary;
  /** `color: null` = foto válida para todos los colores. */
  images: { id: string; url: string; color: string | null }[];
  variants: VariantOption[];
  /** El mismo modelo en otros colores (cada uno es su propio producto). */
  siblings: ModelSibling[];
};

export type ModelSibling = {
  slug: string;
  name: string;
  color: string;
  hex: string | null;
  available: boolean;
};

export type CatalogPageData = {
  items: ProductCardData[];
  total: number;
  page: number;
  pageCount: number;
};

export type CatalogFacets = {
  categories: CategorySummary[];
  colors: ColorSwatch[];
  sizes: string[];
  /** Centavos */
  priceRange: { min: number; max: number };
};

export type CategoryHighlight = CategorySummary & {
  productCount: number;
  image: string | null;
};

export type SearchResult = {
  slug: string;
  name: string;
  price: number;
  category: string;
  image: string | null;
};
