import { createHash, timingSafeEqual } from "node:crypto";

import { EXPIRY_GRACE_MINUTES } from "@/lib/checkout/totals";
import { serverEnv } from "@/lib/env/server";
import { revalidateCatalogStock } from "@/server/catalog/invalidate";
import { sweepExpiredOrders } from "@/server/services/checkout";
import { overduePendingOrders } from "@/server/services/orders";

/** Comparación en tiempo constante (los hashes igualan la longitud). */
function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${serverEnv("CRON_SECRET")}`;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(expected));
}

/**
 * GET /api/cron/expire-orders — Vercel Cron (ver vercel.json).
 * Respaldo del webhook `checkout.session.expired`: libera el stock de las
 * órdenes PENDING vencidas. Protegido con `Authorization: Bearer CRON_SECRET`.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const orders = await overduePendingOrders(now, EXPIRY_GRACE_MINUTES);
  const { stockChanged, ...summary } = await sweepExpiredOrders(orders, now);
  if (stockChanged) revalidateCatalogStock();

  return Response.json({ checked: orders.length, ...summary });
}
