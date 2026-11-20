import {
  CircleAlertIcon,
  CircleCheckIcon,
  Loader2Icon,
  SearchXIcon,
} from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import {
  ClearCartOnPaid,
  RefreshWhilePending,
} from "@/components/checkout/order-status-watcher";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { lineTotal } from "@/lib/money";
import { orderNumber } from "@/lib/orders/status";
import { getOrderBySession, type OrderSummary } from "@/server/services/orders";

export const metadata: Metadata = {
  title: "Pedido",
  robots: { index: false, follow: false },
};

const sessionIdSchema = z
  .string()
  .regex(/^cs_(test|live)_[A-Za-z0-9]{10,200}$/);

/**
 * Solo lectura: muestra el estado que dejó el webhook. Esta página NUNCA
 * marca una orden como pagada (ATELIER.md §7).
 */
export default function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/success">) {
  return (
    <Container className="max-w-2xl py-12">
      <Suspense fallback={<OrderSkeleton />}>
        <OrderResult searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function OrderResult({
  searchParams,
}: Pick<PageProps<"/checkout/success">, "searchParams">) {
  const raw = (await searchParams).session_id;
  const sessionId = sessionIdSchema.safeParse(
    Array.isArray(raw) ? raw[0] : raw,
  );
  const order = sessionId.success
    ? await getOrderBySession(sessionId.data)
    : null;

  if (!order) {
    return (
      <EmptyState
        icon={SearchXIcon}
        headingLevel="h1"
        title="No encontramos este pedido"
        description="El enlace no es válido o ha caducado. Si pagaste, revisa tu correo de confirmación de Stripe."
        action={
          <Button asChild>
            <Link href="/catalogo">Seguir comprando</Link>
          </Button>
        }
      />
    );
  }

  switch (order.status) {
    case "PENDING":
      return (
        <div
          className="flex flex-col items-center gap-3 text-center"
          role="status"
        >
          <RefreshWhilePending />
          <Loader2Icon
            className="size-8 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            Estamos confirmando tu pago…
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Suele tardar unos segundos. Esta página se actualizará sola; no
            vuelvas a pagar.
          </p>
        </div>
      );
    case "EXPIRED":
    case "CANCELLED":
      return (
        <EmptyState
          icon={CircleAlertIcon}
          headingLevel="h1"
          title="El pago no se completó"
          description="No se realizó ningún cargo y los artículos volvieron al stock. Tu carrito sigue guardado."
          action={
            <Button asChild>
              <Link href="/catalogo">Volver a la tienda</Link>
            </Button>
          }
        />
      );
    default:
      return <PaidOrder order={order} />;
  }
}

function PaidOrder({ order }: { order: OrderSummary }) {
  return (
    <div className="flex flex-col gap-8">
      <ClearCartOnPaid />
      <header className="flex flex-col items-center gap-3 text-center">
        <CircleCheckIcon className="size-10 text-primary" aria-hidden="true" />
        <h1 className="text-3xl font-semibold tracking-tight">
          ¡Gracias por tu compra!
        </h1>
        <p className="text-sm text-muted-foreground">
          Pedido <span className="font-mono">{orderNumber(order.id)}</span>
          {order.email && (
            <>
              {" "}
              · <span className="text-foreground">{order.email}</span>
            </>
          )}
        </p>
      </header>

      <section aria-labelledby="resumen-pedido" className="rounded-lg border">
        <h2 id="resumen-pedido" className="border-b px-4 py-3 font-medium">
          Resumen
        </h2>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-4 px-4 py-3 text-sm"
            >
              <span>
                {item.name}
                <span className="text-muted-foreground">
                  {" "}
                  × {item.quantity}
                </span>
              </span>
              <Price cents={lineTotal(item.price, item.quantity)} />
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t px-4 py-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>
              <Price cents={order.subtotal} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Envío</dt>
            <dd>
              {order.shippingCost === 0 ? (
                "Gratis"
              ) : (
                <Price cents={order.shippingCost} />
              )}
            </dd>
          </div>
          <div className="flex justify-between pt-1 font-medium">
            <dt>Total</dt>
            <dd>
              <Price cents={order.total} />
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex justify-center">
        <Button asChild>
          <Link href="/catalogo">Seguir comprando</Link>
        </Button>
      </div>
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div
      className="flex flex-col items-center gap-4"
      role="status"
      aria-label="Cargando pedido"
    >
      <Skeleton className="size-10 rounded-full" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
