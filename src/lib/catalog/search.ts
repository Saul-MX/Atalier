import { z } from "zod";

export const SEARCH_MIN_LENGTH = 2;

/** Validación compartida del término de búsqueda predictiva. */
export const searchQuerySchema = z.object({
  q: z.string().trim().min(SEARCH_MIN_LENGTH).max(60),
});
