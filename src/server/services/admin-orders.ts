import "server-only";

import { type OrderStatus, Prisma } from "@/generated/prisma/client";
import { LOW_STOCK_THRESHOLD } from "@/lib/catalog/variants";
import {
  addDays,
  type DailySales,
  fillDailySeries,
  STORE_TIME_ZONE,
  storeDay,
} from "@/lib/orders/daily-sales";
import {
  nextFulfillmentStatus,
  orderIdQuery,
  SOLD_STATUSES,
} from "@/lib/orders/status";
import { prisma } from "@/lib/prisma";

/**
 * Pedidos y métricas del panel. Sin comprobación de permisos: la hacen las
 * páginas (requireAdminPage) y las Server Actions (requireAdmin).
 */

export const ORDERS_PAGE_SIZE = 20;

export type AdminOrderRow = {
  id: string;
  createdAt: Date;
  email: string;
  customerName: string | null;
  status: OrderStatus;
  total: number;
  units: number;
};

export async function listAdminOrders(filters: {
  status: OrderStatus | null;
  q?: string;
  page: number;
}) {
  const where: Prisma.OrderWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { id: { contains: orderIdQuery(filters.q) } },
      { email: { contains: filters.q, mode: "insensitive" } },
      { shippingName: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [total, rows, counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        email: true,
        status: true,
        total: true,
        shippingName: true,
        user: { select: { name: true } },
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return {
    rows: rows.map((row): AdminOrderRow => ({
      id: row.id,
      createdAt: row.createdAt,
      email: row.email,
      customerName: row.shippingName ?? row.user?.name ?? null,
      status: row.status,
      total: row.total,
      units: row.items.reduce((sum, item) => sum + item.quantity, 0),
    })),
    total,
    pageCount: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
    countsByStatus: Object.fromEntries(
      counts.map((c) => [c.status, c._count._all]),
    ) as Partial<Record<OrderStatus, number>>,
  };
}

export async function getAdminOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      email: true,
      subtotal: true,
      shippingCost: true,
      total: true,
      currency: true,
      createdAt: true,
      paidAt: true,
      shippedAt: true,
      deliveredAt: true,
      expiresAt: true,
      stripeSessionId: true,
      paymentIntentId: true,
      shippingName: true,
      shippingLine1: true,
      shippingLine2: true,
      shippingCity: true,
      shippingState: true,
      shippingZip: true,
      shippingCountry: true,
      user: { select: { name: true, email: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          quantity: true,
          price: true,
          variant: {
            select: {
              sku: true,
              product: { select: { id: true, slug: true } },
            },
          },
        },
      },
    },
  });
}

export type AdminOrderDetail = NonNullable<
  Awaited<ReturnType<typeof getAdminOrder>>
>;

export type AdvanceResult =
  | { ok: true; status: OrderStatus }
  | {
      ok: false;
      reason: "not-found" | "invalid" | "stale";
      current?: OrderStatus;
    };

/**
 * Avanza el envío un paso. `expected` es el estado que vio el admin: si otro
 * admin (o el sistema) lo cambió entretanto, no se aplica (`stale`).
 */
export async function advanceOrder(
  id: string,
  expected: OrderStatus,
  now = new Date(),
): Promise<AdvanceResult> {
  const next = nextFulfillmentStatus(expected);
  if (!next) return { ok: false, reason: "invalid" };

  const { count } = await prisma.order.updateMany({
    where: { id, status: expected },
    data: {
      status: next,
      ...(next === "SHIPPED" && { shippedAt: now }),
      ...(next === "DELIVERED" && { deliveredAt: now }),
    },
  });
  if (count === 1) return { ok: true, status: next };

  const current = await prisma.order.findUnique({
    where: { id },
    select: { status: true },
  });
  return current
    ? { ok: false, reason: "stale", current: current.status }
    : { ok: false, reason: "not-found" };
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export type DashboardMetrics = {
  series: DailySales[];
  revenue30: number;
  revenuePrev30: number;
  orders30: number;
  toShip: number;
  pendingPayment: number;
  lowStock: {
    id: string;
    productId: string;
    productName: string;
    color: string;
    size: string;
    stock: number;
  }[];
  lowStockTotal: number;
};

const DAYS = 30;

export async function getDashboardMetrics(
  now = new Date(),
): Promise<DashboardMetrics> {
  const today = storeDay(now);
  const firstDay = addDays(today, -(2 * DAYS - 1));
  // Margen de 2 días para cubrir el desfase de zona horaria; el filtro fino
  // se hace por día de la tienda.
  const since = new Date(`${addDays(firstDay, -2)}T00:00:00Z`);

  const lowStockWhere = {
    stock: { lte: LOW_STOCK_THRESHOLD },
    product: { active: true },
  } satisfies Prisma.ProductVariantWhereInput;

  const [daily, toShip, pendingPayment, lowStock, lowStockTotal] =
    await Promise.all([
      prisma.$queryRaw<{ day: string; revenue: bigint; orders: number }[]>`
        SELECT to_char(("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE ${STORE_TIME_ZONE}, 'YYYY-MM-DD') AS day,
               SUM("total")::bigint AS revenue,
               COUNT(*)::int AS orders
        FROM "Order"
        WHERE "status"::text IN (${Prisma.join([...SOLD_STATUSES])})
          AND "paidAt" >= ${since}
        GROUP BY 1`,
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.productVariant.findMany({
        where: lowStockWhere,
        orderBy: [{ stock: "asc" }, { productId: "asc" }, { id: "asc" }],
        take: 8,
        select: {
          id: true,
          color: true,
          size: true,
          stock: true,
          product: { select: { id: true, name: true } },
        },
      }),
      prisma.productVariant.count({ where: lowStockWhere }),
    ]);

  const rows = daily.map((row) => ({
    day: row.day,
    revenue: Number(row.revenue),
    orders: row.orders,
  }));
  const both = fillDailySeries(rows, today, 2 * DAYS);
  const previous = both.slice(0, DAYS);
  const series = both.slice(DAYS);
  const sum = (list: DailySales[], key: "revenue" | "orders") =>
    list.reduce((total, day) => total + day[key], 0);

  return {
    series,
    revenue30: sum(series, "revenue"),
    revenuePrev30: sum(previous, "revenue"),
    orders30: sum(series, "orders"),
    toShip,
    pendingPayment,
    lowStock: lowStock.map((v) => ({
      id: v.id,
      productId: v.product.id,
      productName: v.product.name,
      color: v.color,
      size: v.size,
      stock: v.stock,
    })),
    lowStockTotal,
  };
}
