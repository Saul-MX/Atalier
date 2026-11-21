/**
 * Filtros del catálogo → URL, sin dependencias: lo importan componentes de
 * cliente (cabecera, búsqueda, filtros), así que no debe arrastrar zod al
 * navegador. La lectura y validación de la URL vive en ./filters.ts (servidor).
 */

export const SORT_OPTIONS = {
  novedades: "Novedades",
  "precio-asc": "Precio: menor a mayor",
  "precio-desc": "Precio: mayor a menor",
} as const;

export type CatalogSort = keyof typeof SORT_OPTIONS;
export const DEFAULT_SORT: CatalogSort = "novedades";
export const PAGE_SIZE = 12;

export type CatalogFilters = {
  category?: string;
  q?: string;
  colors: string[];
  sizes: string[];
  /** Centavos */
  minPrice?: number;
  /** Centavos */
  maxPrice?: number;
  sort: CatalogSort;
  page: number;
};

/** Convierte filtros a query string, omitiendo los valores por defecto. */
export function serializeCatalogFilters(
  filters: Partial<CatalogFilters>,
): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("categoria", filters.category);
  if (filters.q) params.set("q", filters.q);
  for (const color of filters.colors ?? []) params.append("color", color);
  for (const size of filters.sizes ?? []) params.append("talla", size);
  if (filters.minPrice !== undefined)
    params.set("precio_min", String(Math.floor(filters.minPrice / 100)));
  if (filters.maxPrice !== undefined)
    params.set("precio_max", String(Math.floor(filters.maxPrice / 100)));
  if (filters.sort && filters.sort !== DEFAULT_SORT)
    params.set("orden", filters.sort);
  if (filters.page && filters.page > 1)
    params.set("pagina", String(filters.page));
  return params.toString();
}

export function catalogHref(filters: Partial<CatalogFilters>): string {
  const query = serializeCatalogFilters(filters);
  return query ? `/catalogo?${query}` : "/catalogo";
}

/** Cualquier cambio de filtro vuelve a la página 1. */
export function withFilters(
  current: CatalogFilters,
  patch: Partial<CatalogFilters>,
): CatalogFilters {
  return { ...current, page: 1, ...patch };
}

export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return Boolean(
    filters.category ||
    filters.q ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined,
  );
}
