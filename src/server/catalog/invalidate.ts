import "server-only";

import { revalidateTag, updateTag } from "next/cache";

import { CATALOG_TAG, productTag } from "./queries";

/**
 * Invalida las lecturas cacheadas de la tienda tras una mutación del admin.
 * `updateTag` (solo Server Actions) expira la caché al momento: la siguiente
 * visita a la tienda ya ve el cambio (read-your-own-writes).
 */
export function invalidateCatalog(...slugs: string[]): void {
  updateTag(CATALOG_TAG);
  for (const slug of new Set(slugs)) updateTag(productTag(slug));
}

/**
 * Para Route Handlers (checkout, webhook, cron), donde `updateTag` no existe.
 * Stale-while-revalidate: el stock que muestra la tienda es orientativo; el
 * checkout siempre lo verifica en la BD.
 */
export function revalidateCatalogStock(): void {
  revalidateTag(CATALOG_TAG, "max");
}
