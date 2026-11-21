import { z } from "zod";

import { SEARCH_MIN_LENGTH } from "./search-config";

export { SEARCH_MIN_LENGTH };

/** Validación compartida del término de búsqueda predictiva. */
export const searchQuerySchema = z.object({
  q: z.string().trim().min(SEARCH_MIN_LENGTH).max(60),
});
