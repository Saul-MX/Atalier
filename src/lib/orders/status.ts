import { type OrderStatus } from "@/generated/prisma/enums";

/**
 * Estados de pedido para la UI y transiciones que puede hacer el admin.
 * PENDING → PAID lo hace SOLO el webhook/cron; EXPIRED/CANCELLED, el sistema.
 * El admin solo avanza el envío: PAID → SHIPPED → DELIVERED.
 */

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "EXPIRED",
] as const satisfies readonly OrderStatus[];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pago pendiente",
  PAID: "Pagado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

/** Estados que cuentan como venta (ingresos, historial del cliente). */
export const SOLD_STATUSES = [
  "PAID",
  "SHIPPED",
  "DELIVERED",
] as const satisfies readonly OrderStatus[];

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "SHIPPED",
  SHIPPED: "DELIVERED",
};

/** Siguiente estado que el admin puede aplicar, o null si no hay. */
export function nextFulfillmentStatus(status: OrderStatus): OrderStatus | null {
  return NEXT[status] ?? null;
}

export const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  PAID: "Marcar como enviado",
  SHIPPED: "Marcar como entregado",
};

export function isSold(status: OrderStatus): boolean {
  return (SOLD_STATUSES as readonly OrderStatus[]).includes(status);
}

/** Número visible del pedido: "#" + últimos 8 caracteres del id, en mayúsculas. */
export function orderNumber(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}

/** Normaliza lo que el admin teclea ("#ABCD1234") para buscar por id. */
export function orderIdQuery(q: string): string {
  return q.trim().replace(/^#/, "").toLowerCase();
}
