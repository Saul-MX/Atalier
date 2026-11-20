import { lineTotal } from "@/lib/money";
import { shippingCostFor } from "@/lib/shipping";

/**
 * Totales de un pedido en centavos, calculados SIEMPRE con precios de la BD.
 * Cumple el CHECK de la tabla Order: total = subtotal + shippingCost.
 */
export function orderTotals(lines: { unitPrice: number; quantity: number }[]) {
  const subtotal = lines.reduce(
    (sum, line) => sum + lineTotal(line.unitPrice, line.quantity),
    0,
  );
  const shippingCost = shippingCostFor(subtotal);
  return { subtotal, shippingCost, total: subtotal + shippingCost };
}

/**
 * Stripe exige que `expires_at` esté al menos 30 min en el futuro; un minuto
 * de margen evita rechazos por desfase de reloj.
 */
export const CHECKOUT_TTL_MINUTES = 31;

/**
 * El cron solo actúa sobre órdenes vencidas hace más de este margen, para dar
 * prioridad al webhook `checkout.session.expired`.
 */
export const EXPIRY_GRACE_MINUTES = 5;
