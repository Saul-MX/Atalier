"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/orders/status";
import { requireAdmin, toActionError } from "@/server/auth/guards";
import { advanceOrder } from "@/server/services/admin-orders";
import { idSchema } from "@/server/validators/product";

export type AdvanceOrderResult =
  { ok: true; message: string } | { ok: false; error: string; status?: number };

const inputSchema = z.object({
  orderId: idSchema,
  expected: z.enum(ORDER_STATUSES),
});

/** PAID → SHIPPED → DELIVERED. Rol admin verificado aquí, no solo en la UI. */
export async function advanceOrderAction(
  orderId: string,
  expected: string,
): Promise<AdvanceOrderResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return toActionError(error);
  }

  const input = inputSchema.safeParse({ orderId, expected });
  if (!input.success) return { ok: false, error: "Datos no válidos." };

  const result = await advanceOrder(input.data.orderId, input.data.expected);
  if (!result.ok) {
    switch (result.reason) {
      case "not-found":
        return { ok: false, error: "El pedido ya no existe." };
      case "invalid":
        return {
          ok: false,
          error: "Este pedido no admite cambios de estado manuales.",
        };
      case "stale":
        return {
          ok: false,
          error: `El pedido cambió mientras lo veías: ahora está «${STATUS_LABEL[result.current!]}». Recarga la página.`,
        };
    }
  }

  refresh();
  return {
    ok: true,
    message: `Pedido marcado como «${STATUS_LABEL[result.status]}».`,
  };
}
