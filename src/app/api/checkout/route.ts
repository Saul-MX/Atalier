import { isBanned } from "@/lib/auth/roles";
import { getSession } from "@/server/auth/guards";
import { revalidateCatalogStock } from "@/server/catalog/invalidate";
import { createCheckout } from "@/server/services/checkout";
import {
  checkoutRequestSchema,
  normalizeLines,
} from "@/server/validators/checkout";

/**
 * POST /api/checkout — { items: [{ variantId, quantity }] } → { url }
 *
 * Reserva el stock y crea la orden PENDING en una transacción, luego abre una
 * Checkout Session de Stripe. Respuestas:
 *   200 { url }                       redirigir a Stripe
 *   400 { error }                     cuerpo inválido
 *   403 { error }                     cuenta suspendida
 *   409 { error, variants: [...] }    no hay stock suficiente (nada reservado)
 *   502 { error }                     Stripe falló (stock devuelto)
 * Invitados permitidos: la sesión es opcional.
 */
export async function POST(request: Request): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Se esperaba JSON." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON no válido." }, { status: 400 });
  }

  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Pedido no válido." },
      { status: 400 },
    );
  }
  const lines = normalizeLines(parsed.data.items);
  if ("error" in lines) {
    return Response.json(
      { error: "Superas el máximo de unidades por artículo." },
      { status: 400 },
    );
  }

  const session = await getSession();
  if (session && isBanned(session.user)) {
    return Response.json({ error: "Cuenta suspendida." }, { status: 403 });
  }

  const result = await createCheckout({
    lines,
    user: session ? { id: session.user.id, email: session.user.email } : null,
  });

  if (result.ok) {
    revalidateCatalogStock();
    return Response.json({ url: result.url });
  }
  if (result.reason === "unavailable") {
    return Response.json(
      {
        error: "Algunos artículos ya no tienen stock suficiente.",
        variants: result.variants,
      },
      { status: 409 },
    );
  }
  return Response.json(
    {
      error: "No pudimos iniciar el pago. Inténtalo de nuevo en unos minutos.",
    },
    { status: 502 },
  );
}
