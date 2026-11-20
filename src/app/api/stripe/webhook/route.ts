import { serverEnv } from "@/lib/env/server";
import { type Stripe, stripe } from "@/lib/stripe";
import { revalidateCatalogStock } from "@/server/catalog/invalidate";
import { processStripeEvent } from "@/server/services/checkout";

/**
 * POST /api/stripe/webhook
 *
 * 1. Cuerpo SIN parsear (`req.text()`): la firma se calcula sobre los bytes.
 * 2. `constructEvent` verifica la firma con STRIPE_WEBHOOK_SECRET → 400 si no.
 * 3. processStripeEvent es idempotente (tabla StripeEvent).
 * Un 500 hace que Stripe reintente; por eso los errores no se silencian.
 */
export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Falta la firma." }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      serverEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch {
    return Response.json({ error: "Firma no válida." }, { status: 400 });
  }

  const outcome = await processStripeEvent(event);
  if (outcome.stockChanged) revalidateCatalogStock();

  return Response.json({ received: true, status: outcome.status });
}
