import { z } from "zod";

/**
 * Lectura de los filtros del catálogo desde la URL (searchParams), con zod.
 * Solo servidor: los componentes de cliente importan ./filters-url, que no
 * arrastra zod al navegador. Es tolerante: los valores inválidos se descartan
 * en vez de romper la página.
 *
 * Parámetros: categoria, q, color (repetible), talla (repetible),
 * precio_min / precio_max (pesos enteros), orden, pagina.
 */

import { type CatalogFilters, DEFAULT_SORT } from "./filters-url";

export * from "./filters-url";

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
