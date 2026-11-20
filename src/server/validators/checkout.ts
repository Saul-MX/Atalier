import { z } from "zod";

import { MAX_QUANTITY_PER_ITEM } from "@/lib/catalog/variants";

/**
 * Cuerpo de POST /api/checkout. Solo ids y cantidades: cualquier otro campo
 * (precio, nombre…) se descarta. El servidor relee todo de la BD.
 */
export const MAX_CHECKOUT_LINES = 50;

export const checkoutRequestSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().trim().min(1).max(64),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
      }),
    )
    .min(1, "El carrito está vacío.")
    .max(MAX_CHECKOUT_LINES),
});

export type CheckoutLine = { variantId: string; quantity: number };

/**
 * Une líneas repetidas de la misma variante y las ordena por id. El orden fijo
 * hace que todas las transacciones bloqueen las filas en el mismo orden y no
 * haya interbloqueos entre carritos que comparten variantes.
 */
export function normalizeLines(
  items: CheckoutLine[],
): CheckoutLine[] | { error: "too-many"; variantId: string } {
  const merged = new Map<string, number>();
  for (const { variantId, quantity } of items) {
    merged.set(variantId, (merged.get(variantId) ?? 0) + quantity);
  }
  const lines = [...merged]
    .map(([variantId, quantity]) => ({ variantId, quantity }))
    .sort((a, b) =>
      a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0,
    );

  const over = lines.find((line) => line.quantity > MAX_QUANTITY_PER_ITEM);
  return over ? { error: "too-many", variantId: over.variantId } : lines;
}
