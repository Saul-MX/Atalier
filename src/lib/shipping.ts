/**
 * Reglas de envío (centavos MXN). El servidor las vuelve a aplicar al crear el
 * checkout; en el cliente solo se usan para mostrar la barra de progreso.
 */
export const FREE_SHIPPING_THRESHOLD = 150_000; // $1,500.00
export const FLAT_SHIPPING_COST = 14_900; // $149.00

export function shippingCostFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST;
}

export type FreeShippingProgress = {
  qualifies: boolean;
  /** Centavos que faltan para el envío gratis (0 si ya aplica). */
  remaining: number;
  /** 0–100, entero. */
  percent: number;
};

export function freeShippingProgress(subtotal: number): FreeShippingProgress {
  const clamped = Math.max(0, subtotal);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - clamped);
  return {
    qualifies: remaining === 0,
    remaining,
    percent: Math.min(
      100,
      Math.floor((clamped / FREE_SHIPPING_THRESHOLD) * 100),
    ),
  };
}
