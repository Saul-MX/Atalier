/**
 * Escala del eje Y de la gráfica de ventas: ticks en pesos "redondos"
 * (1, 2, 2.5 o 5 × 10^n) que cubren el máximo. Entrada y salida en centavos.
 */
export function niceTicks(maxCents: number, count = 4): number[] {
  const maxPesos = Math.max(0, maxCents) / 100;
  if (maxPesos === 0) return [0, 100_000];

  const rough = maxPesos / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ??
    10 * magnitude;
  const steps = Math.ceil(maxPesos / step);
  return Array.from({ length: steps + 1 }, (_, i) =>
    Math.round(i * step * 100),
  );
}

const full = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/**
 * Etiqueta de eje: completa bajo 10,000 ("$2,500") y compacta en un eje que
 * llega a 10,000 o más ("$12.5K"). Un mismo estilo para todo el eje.
 */
export function axisLabel(cents: number, axisMaxCents: number): string {
  const pesos = cents / 100;
  if (axisMaxCents / 100 < 10_000) return `$${full.format(pesos)}`;
  if (pesos === 0) return "$0";
  const thousands = pesos / 1000;
  return `$${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
}
