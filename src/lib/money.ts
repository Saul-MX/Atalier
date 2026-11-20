/**
 * Dinero en ATELIER: SIEMPRE enteros en centavos (MXN). Estas funciones son la
 * única frontera entre centavos y texto legible; no hagas aritmética con
 * decimales en ningún otro sitio.
 */

export const CURRENCY = "mxn" as const;

const priceFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** true si `value` es un importe válido en centavos (entero ≥ 0). */
export function isCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function assertCents(value: number): void {
  if (!isCents(value)) {
    throw new RangeError(
      `Importe inválido: ${value}. Se esperan centavos enteros ≥ 0.`,
    );
  }
}

/** 129900 → "$1,299.00" */
export function formatPrice(cents: number): string {
  assertCents(cents);
  return priceFormatter.format(cents / 100);
}

/**
 * Convierte un texto en pesos ("1,299.50", "$1299", "1299.5") a centavos.
 * Devuelve null si no es un importe válido (negativo, > 2 decimales, vacío…).
 * No usa aritmética de coma flotante.
 */
export function parsePriceToCents(input: string): number | null {
  const normalized = input.trim().replace(/^\$/, "").replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const [, pesos, fraction = ""] = match;
  const cents = Number(pesos) * 100 + Number(fraction.padEnd(2, "0"));
  return isCents(cents) ? cents : null;
}

/** Suma segura de líneas: precio unitario (centavos) × cantidad. */
export function lineTotal(unitCents: number, quantity: number): number {
  assertCents(unitCents);
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError(`Cantidad inválida: ${quantity}`);
  }
  const total = unitCents * quantity;
  assertCents(total);
  return total;
}
