import "server-only";

import { publicEnv } from "@/lib/env/public";
import { CURRENCY } from "@/lib/money";
import { type Stripe, stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { type CheckoutLine } from "@/server/validators/checkout";

import {
  attachCheckoutSession,
  type PaymentDetails,
  type PricedLine,
  payOrderTx,
  releaseOrder,
  releaseOrderTx,
  reserveOrder,
  type UnavailableVariant,
} from "./orders";

/**
 * Checkout con Stripe (ATELIER.md §7). El dinero solo cambia de estado aquí,
 * en el webhook y en el cron; nunca desde páginas ni desde el cliente.
 */

export type CheckoutResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; reason: "unavailable"; variants: UnavailableVariant[] }
  | { ok: false; reason: "payment-provider" };

const isHttps = (url: string | null): url is string =>
  url !== null && url.startsWith("https://");

function lineItem(
  line: PricedLine,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: line.quantity,
    price_data: {
      currency: CURRENCY,
      unit_amount: line.unitPrice,
      product_data: {
        name: line.name,
        description: `${line.color} · Talla ${line.size}`,
        // Stripe solo acepta URLs públicas (las de Cloudinary; no los SVG del seed).
        ...(isHttps(line.image) && { images: [line.image] }),
      },
    },
  };
}

export async function createCheckout(input: {
  lines: CheckoutLine[];
  user: { id: string; email: string } | null;
  now?: Date;
}): Promise<CheckoutResult> {
  const reserved = await reserveOrder({
    lines: input.lines,
    userId: input.user?.id ?? null,
    // Invitado: Stripe pide el correo y el webhook lo guarda al pagar.
    email: input.user?.email ?? "",
    now: input.now,
  });
  if (!reserved.ok) {
    return { ok: false, reason: "unavailable", variants: reserved.variants };
  }

  const appUrl = publicEnv("NEXT_PUBLIC_APP_URL");
  const { shippingCost } = reserved.totals;

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        currency: CURRENCY,
        locale: "es",
        // Solo tarjeta: el pago se confirma al momento (sin OXXO/pagos diferidos).
        allowed_payment_method_types: ["card"],
        line_items: reserved.lines.map(lineItem),
        shipping_address_collection: { allowed_countries: ["MX"] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name:
                shippingCost === 0 ? "Envío gratis" : "Envío estándar",
              fixed_amount: { amount: shippingCost, currency: CURRENCY },
              delivery_estimate: {
                minimum: { unit: "business_day", value: 3 },
                maximum: { unit: "business_day", value: 7 },
              },
            },
          },
        ],
        ...(input.user && { customer_email: input.user.email }),
        client_reference_id: reserved.orderId,
        metadata: { orderId: reserved.orderId },
        payment_intent_data: { metadata: { orderId: reserved.orderId } },
        expires_at: Math.floor(reserved.expiresAt.getTime() / 1000),
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancel`,
      },
      // Reintentos de red no crean sesiones duplicadas para la misma orden.
      { idempotencyKey: `checkout-${reserved.orderId}` },
    );

    if (!session.url) throw new Error("Stripe no devolvió la URL de la sesión");
    await attachCheckoutSession(reserved.orderId, session.id);
    return { ok: true, url: session.url, orderId: reserved.orderId };
  } catch (error) {
    // Sin sesión de pago no hay forma de completar la compra: devolver el stock.
    console.error(
      "[checkout] Falló Stripe; se libera la orden",
      reserved.orderId,
      error,
    );
    await releaseOrder(reserved.orderId, "CANCELLED");
    return { ok: false, reason: "payment-provider" };
  }
}

// ─── Webhook ────────────────────────────────────────────────────────────────

export function paymentDetails(
  session: Stripe.Checkout.Session,
): PaymentDetails {
  const shipping = session.collected_information?.shipping_details;
  return {
    email: session.customer_details?.email ?? session.customer_email ?? null,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    shipping: shipping
      ? {
          name: shipping.name,
          line1: shipping.address.line1,
          line2: shipping.address.line2,
          city: shipping.address.city,
          state: shipping.address.state,
          zip: shipping.address.postal_code,
          country: shipping.address.country,
        }
      : null,
  };
}

export type EventOutcome = {
  status: "processed" | "duplicate" | "ignored";
  /** true si cambió el stock (hay que revalidar la caché del catálogo). */
  stockChanged: boolean;
};

/**
 * Procesa un evento ya verificado. Idempotente: el `event.id` se inserta en
 * StripeEvent en la MISMA transacción que sus efectos. Si el evento ya estaba,
 * no se hace nada; si el proceso falla, tampoco queda registrado y Stripe lo
 * reintenta.
 */
export async function processStripeEvent(
  event: Stripe.Event,
): Promise<EventOutcome> {
  return prisma.$transaction(async (tx) => {
    // ON CONFLICT DO NOTHING: un duplicado concurrente espera al primero y no inserta.
    const { count } = await tx.stripeEvent.createMany({
      data: [{ id: event.id, type: event.type }],
      skipDuplicates: true,
    });
    if (count === 0) return { status: "duplicate", stockChanged: false };

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        // Solo un pago confirmado pasa la orden a PAID.
        if (session.payment_status !== "paid") {
          return { status: "ignored", stockChanged: false };
        }
        const orderId = await orderIdFor(tx, session);
        if (!orderId) return { status: "ignored", stockChanged: false };
        const paid = await payOrderTx(
          tx,
          orderId,
          paymentDetails(session),
          new Date(event.created * 1000),
        );
        if (!paid) {
          console.error(
            "[webhook] Pago recibido para una orden que no está PENDING",
            orderId,
          );
        }
        return { status: "processed", stockChanged: false };
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const orderId = await orderIdFor(tx, event.data.object);
        if (!orderId) return { status: "ignored", stockChanged: false };
        const released = await releaseOrderTx(tx, orderId, "EXPIRED");
        return { status: "processed", stockChanged: released };
      }
      default:
        return { status: "ignored", stockChanged: false };
    }
  });
}

/** La orden debe existir y estar ligada a ESTA sesión (no basta la metadata). */
async function orderIdFor(
  tx: Parameters<typeof payOrderTx>[0],
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return null;
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { stripeSessionId: true },
  });
  if (!order) return null;
  if (order.stripeSessionId === null) {
    // Carrera: el webhook llegó antes de guardar el id de la sesión.
    await tx.order.update({
      where: { id: orderId },
      data: { stripeSessionId: session.id },
    });
    return orderId;
  }
  if (order.stripeSessionId !== session.id) {
    console.error(
      "[webhook] La sesión no corresponde a la orden",
      orderId,
      session.id,
    );
    return null;
  }
  return orderId;
}

// ─── Cron ───────────────────────────────────────────────────────────────────

export type SweepResult = { paid: number; expired: number; skipped: number };

/**
 * Respaldo del webhook: revisa órdenes PENDING vencidas. Antes de liberar el
 * stock pregunta a Stripe por la sesión; si sigue abierta la expira, para que
 * nadie pueda pagar una orden cuyo stock ya se devolvió.
 */
export async function sweepExpiredOrders(
  orders: { id: string; stripeSessionId: string | null }[],
  now: Date,
): Promise<SweepResult & { stockChanged: boolean }> {
  const result = { paid: 0, expired: 0, skipped: 0, stockChanged: false };

  for (const order of orders) {
    try {
      if (!order.stripeSessionId) {
        if (await releaseOrder(order.id, "CANCELLED")) {
          result.expired++;
          result.stockChanged = true;
        }
        continue;
      }

      let session = await stripe().checkout.sessions.retrieve(
        order.stripeSessionId,
      );
      if (session.status === "open") {
        session = await stripe().checkout.sessions.expire(session.id);
      }

      if (session.status === "complete" && session.payment_status === "paid") {
        // Se perdió el webhook de pago: la orden está pagada.
        const paid = await prisma.$transaction((tx) =>
          payOrderTx(tx, order.id, paymentDetails(session), now),
        );
        if (paid) result.paid++;
      } else if (session.status === "expired") {
        if (await releaseOrder(order.id, "EXPIRED")) {
          result.expired++;
          result.stockChanged = true;
        }
      } else {
        // Completa pero pendiente de un pago asíncrono: lo resolverá su webhook.
        result.skipped++;
      }
    } catch (error) {
      console.error("[cron] No se pudo procesar la orden", order.id, error);
      result.skipped++;
    }
  }
  return result;
}
