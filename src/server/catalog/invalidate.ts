import "server-only";

import { updateTag } from "next/cache";

import { CATALOG_TAG, productTag } from "./queries";

/**
 * Invalida las lecturas cacheadas de la tienda tras una mutación del admin.
 * `updateTag` (solo Server Actions) expira la caché al momento: la siguiente
 * visita a la tienda ya ve el cambio (read-your-own-writes). El checkout y el
 * webhook (Route Handlers) usarán `revalidateTag` en su lugar.
 */
export function invalidateCatalog(...slugs: string[]): void {
  updateTag(CATALOG_TAG);
  for (const slug of new Set(slugs)) updateTag(productTag(slug));
}
