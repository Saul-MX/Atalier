import "server-only";

import { type OrderStatus, type Prisma } from "@/generated/prisma/client";
import { imagesForColor } from "@/lib/catalog/product-images";
import { CHECKOUT_TTL_MINUTES, orderTotals } from "@/lib/checkout/totals";
import { SOLD_STATUSES } from "@/lib/orders/status";
import { prisma } from "@/lib/prisma";
import { type CheckoutLine } from "@/server/validators/checkout";

/**
 * Ciclo de vida de una orden y su stock (ATELIER.md §6–7).
 *
 *   reserveOrder ──► PENDING ──► payOrder ──► PAID        (solo desde webhook/cron)
 *                       └──────► releaseOrder ─► EXPIRED / CANCELLED (+ stock)
 *
 * Todas las transiciones son condicionales (`WHERE status = 'PENDING'`): si el
 * webhook y el cron procesan la misma orden, solo uno la cambia y el stock se
 * devuelve una única vez.
 */

type Db = Prisma.TransactionClient;

export type PricedLine = {
  variantId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  color: string;
  size: string;
  image: string | null;
};

export type UnavailableVariant = {
  variantId: string;
  name: string | null;
  /** Unidades que quedan (0 si no existe o no está a la venta). */
  available: number;
};

export type ReserveResult =
  | {
      ok: true;
      orderId: string;
      expiresAt: Date;
      lines: PricedLine[];
      totals: { subtotal: number; shippingCost: number; total: number };
    }
  | { ok: false; variants: UnavailableVariant[] };

class InsufficientStock extends Error {}

/**
 * Reserva el stock de todas las líneas y crea la orden PENDING, todo o nada.
 * Cada línea ejecuta
 *   UPDATE "ProductVariant" SET stock = stock - qty WHERE id = $id AND stock >= qty
 * Postgres serializa los UPDATE sobre la misma fila y vuelve a evaluar el
 * WHERE tras el bloqueo: con stock 1 y 20 peticiones simultáneas, solo una
 * afecta 1 fila; el resto afecta 0 y aborta su transacción.
 */
export async function reserveOrder(input: {
  lines: CheckoutLine[];
  userId: string | null;
  email: string;
  now?: Date;
}): Promise<ReserveResult> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + CHECKOUT_TTL_MINUTES * 60_000);
  const ids = input.lines.map((line) => line.variantId);

  try {
    return await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          size: true,
          color: true,
          product: {
            select: {
              name: true,
              basePrice: true,
              active: true,
              images: {
                orderBy: { position: "asc" },
                select: { url: true, color: true },
              },
            },
          },
        },
      });
      const byId = new Map(variants.map((v) => [v.id, v]));

      const missing = input.lines.filter(
        (line) => !byId.get(line.variantId)?.product.active,
      );
      if (missing.length > 0) {
        return {
          ok: false as const,
          variants: missing.map((line) => ({
            variantId: line.variantId,
            name: byId.get(line.variantId)?.product.name ?? null,
            available: 0,
          })),
        };
      }

      // Las líneas llegan ordenadas por variantId (normalizeLines).
      for (const line of input.lines) {
        const affected = await tx.$executeRaw`
          UPDATE "ProductVariant"
          SET "stock" = "stock" - ${line.quantity}
          WHERE "id" = ${line.variantId} AND "stock" >= ${line.quantity}`;
        if (affected === 0) throw new InsufficientStock();
      }

      // Precios SIEMPRE de la BD; el cliente solo mandó ids y cantidades.
      const lines: PricedLine[] = input.lines.map((line) => {
        const variant = byId.get(line.variantId)!;
        return {
          variantId: line.variantId,
          quantity: line.quantity,
          unitPrice: variant.product.basePrice,
          name: variant.product.name,
          color: variant.color,
          size: variant.size,
          image:
            imagesForColor(variant.product.images, variant.color)[0]?.url ??
            null,
        };
      });
      const totals = orderTotals(lines);

      const order = await tx.order.create({
        data: {
          userId: input.userId,
          email: input.email,
          status: "PENDING",
          ...totals,
          expiresAt,
          items: {
            create: lines.map((line) => ({
              variantId: line.variantId,
              quantity: line.quantity,
              price: line.unitPrice,
              name: `${line.name} · ${line.color} / ${line.size}`,
            })),
          },
        },
        select: { id: true },
      });

      return { ok: true as const, orderId: order.id, expiresAt, lines, totals };
    });
  } catch (error) {
    if (!(error instanceof InsufficientStock)) throw error;
    // La transacción se deshizo: informar qué líneas no alcanzan con el stock actual.
    return { ok: false, variants: await insufficientLines(input.lines) };
  }
}

async function insufficientLines(
  lines: CheckoutLine[],
): Promise<UnavailableVariant[]> {
  const current = await prisma.productVariant.findMany({
    where: { id: { in: lines.map((line) => line.variantId) } },
    select: { id: true, stock: true, product: { select: { name: true } } },
  });
  const byId = new Map(current.map((v) => [v.id, v]));
  return lines
    .filter((line) => (byId.get(line.variantId)?.stock ?? 0) < line.quantity)
    .map((line) => ({
      variantId: line.variantId,
      name: byId.get(line.variantId)?.product.name ?? null,
      available: byId.get(line.variantId)?.stock ?? 0,
    }));
}

export async function attachCheckoutSession(
  orderId: string,
  sessionId: string,
) {
  await prisma.order.update({
    where: { id: orderId },
    data: { stripeSessionId: sessionId },
  });
}

/**
 * PENDING → EXPIRED/CANCELLED y devuelve el stock. Devuelve false (sin tocar
 * nada) si la orden ya no estaba PENDING: así es seguro llamarla dos veces.
 */
export async function releaseOrderTx(
  tx: Db,
  orderId: string,
  to: Extract<OrderStatus, "EXPIRED" | "CANCELLED">,
): Promise<boolean> {
  const { count } = await tx.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: to },
  });
  if (count === 0) return false;

  const items = await tx.orderItem.findMany({
    where: { orderId },
    orderBy: { variantId: "asc" },
    select: { variantId: true, quantity: true },
  });
  for (const item of items) {
    await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET "stock" = "stock" + ${item.quantity}
      WHERE "id" = ${item.variantId}`;
  }
  return true;
}

export function releaseOrder(
  orderId: string,
  to: Extract<OrderStatus, "EXPIRED" | "CANCELLED">,
): Promise<boolean> {
  return prisma.$transaction((tx) => releaseOrderTx(tx, orderId, to));
}

export type PaymentDetails = {
  email: string | null;
  paymentIntentId: string | null;
  shipping: {
    name: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
  } | null;
};

/** PENDING → PAID con los datos del pago. false si ya no estaba PENDING. */
export async function payOrderTx(
  tx: Db,
  orderId: string,
  details: PaymentDetails,
  paidAt: Date,
): Promise<boolean> {
  const { count } = await tx.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: {
      status: "PAID",
      paidAt,
      paymentIntentId: details.paymentIntentId,
      ...(details.email && { email: details.email }),
      ...(details.shipping && {
        shippingName: details.shipping.name,
        shippingLine1: details.shipping.line1,
        shippingLine2: details.shipping.line2,
        shippingCity: details.shipping.city,
        shippingState: details.shipping.state,
        shippingZip: details.shipping.zip,
        shippingCountry: details.shipping.country,
      }),
    },
  });
  return count === 1;
}

/** Órdenes PENDING vencidas hace más de `graceMinutes` (para el cron). */
export function overduePendingOrders(
  now: Date,
  graceMinutes: number,
  take = 50,
) {
  return prisma.order.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date(now.getTime() - graceMinutes * 60_000) },
    },
    orderBy: { expiresAt: "asc" },
    take,
    select: { id: true, stripeSessionId: true },
  });
}

export type OrderSummary = {
  id: string;
  status: OrderStatus;
  email: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: Date;
  items: { id: string; name: string; quantity: number; price: number }[];
};

/** Resumen de solo lectura para /checkout/success. */
export function getOrderBySession(
  sessionId: string,
): Promise<OrderSummary | null> {
  return prisma.order.findUnique({
    where: { stripeSessionId: sessionId },
    select: {
      id: true,
      status: true,
      email: true,
      subtotal: true,
      shippingCost: true,
      total: true,
      createdAt: true,
      items: {
        orderBy: { id: "asc" },
        select: { id: true, name: true, quantity: true, price: true },
      },
    },
  });
}

// ─── Cliente ────────────────────────────────────────────────────────────────

/** Historial del cliente: solo pedidos pagados (no checkouts abandonados). */
export function listCustomerOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId, status: { in: [...SOLD_STATUSES] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      createdAt: true,
      paidAt: true,
      shippedAt: true,
      deliveredAt: true,
      subtotal: true,
      shippingCost: true,
      total: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          quantity: true,
          price: true,
          variant: { select: { product: { select: { slug: true } } } },
        },
      },
    },
  });
}

export type CustomerOrder = Awaited<
  ReturnType<typeof listCustomerOrders>
>[number];
