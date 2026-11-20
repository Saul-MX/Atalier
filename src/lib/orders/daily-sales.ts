/**
 * Serie de ventas por día para el dashboard. Los días se cuentan en la zona
 * horaria de la tienda (una venta a las 23:30 en CDMX es de ese día, aunque
 * en UTC ya sea el siguiente).
 */
export const STORE_TIME_ZONE = "America/Mexico_City";

export type DailySales = {
  /** YYYY-MM-DD en la zona de la tienda. */
  day: string;
  /** Centavos. */
  revenue: number;
  orders: number;
};

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha → "YYYY-MM-DD" en la zona de la tienda. */
export function storeDay(date: Date): string {
  return dayFormatter.format(date);
}

/** "2026-11-20" + n días (aritmética de calendario, sin horas). */
export function addDays(day: string, n: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/**
 * Rellena con ceros los días sin ventas para obtener exactamente `days`
 * puntos consecutivos que terminan en `lastDay` (incluido).
 */
export function fillDailySeries(
  rows: DailySales[],
  lastDay: string,
  days = 30,
): DailySales[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(lastDay, i - (days - 1));
    return byDay.get(day) ?? { day, revenue: 0, orders: 0 };
  });
}

const labelFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "2026-11-20" → "20 nov" */
export function shortDayLabel(day: string): string {
  return labelFormatter.format(new Date(`${day}T00:00:00Z`)).replace(".", "");
}
