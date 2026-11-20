import { STORE_TIME_ZONE } from "@/lib/orders/daily-sales";

/** Fechas en la zona horaria de la tienda (el servidor puede estar en UTC). */
const dateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: STORE_TIME_ZONE,
});

const dateOnly = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeZone: STORE_TIME_ZONE,
});

/** "20 nov 2026, 13:51" */
export const formatDateTime = (date: Date) => dateTime.format(date);

/** "20 de noviembre de 2026" */
export const formatDate = (date: Date) => dateOnly.format(date);
