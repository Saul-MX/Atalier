import { z } from "zod";

/**
 * Filtros del catálogo <-> URL (searchParams). Se usa en el servidor (para leer
 * la URL) y en el cliente (para construir la siguiente URL). Es tolerante:
 * los valores inválidos se descartan en vez de romper la página.
 *
 * Parámetros: categoria, q, color (repetible), talla (repetible),
 * precio_min / precio_max (pesos enteros), orden, pagina.
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

export type RawSearchParams = Record<string, string | string[] | undefined>;

const slugSchema = z.string().regex(/^[a-z0-9-]{1,60}$/);
const textSchema = z.string().trim().min(1).max(60);
const pesosSchema = z.coerce.number().int().min(0).max(1_000_000);
const pageSchema = z.coerce.number().int().min(1).max(1_000);
const sortSchema = z.enum(["novedades", "precio-asc", "precio-desc"]);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function optional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  if (value === undefined || value === "") return undefined;
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

function uniqueValid(values: string[], max = 12): string[] {
  const valid = values
    .map((value) => optional(textSchema, value))
    .filter((value): value is string => value !== undefined);
  return [...new Set(valid)].slice(0, max);
}

export function parseCatalogFilters(params: RawSearchParams): CatalogFilters {
  const minPesos = optional(pesosSchema, first(params.precio_min));
  const maxPesos = optional(pesosSchema, first(params.precio_max));
  // Si el rango viene invertido, lo corregimos en lugar de devolver vacío.
  const [lo, hi] =
    minPesos !== undefined && maxPesos !== undefined && minPesos > maxPesos
      ? [maxPesos, minPesos]
      : [minPesos, maxPesos];

  return {
    category: optional(slugSchema, first(params.categoria)),
    q: optional(textSchema, first(params.q)),
    colors: uniqueValid(all(params.color)),
    sizes: uniqueValid(all(params.talla)),
    minPrice: lo === undefined ? undefined : lo * 100,
    maxPrice: hi === undefined ? undefined : hi * 100,
    sort: optional(sortSchema, first(params.orden)) ?? DEFAULT_SORT,
    page: optional(pageSchema, first(params.pagina)) ?? 1,
  };
}

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
