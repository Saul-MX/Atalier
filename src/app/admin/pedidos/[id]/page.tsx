import { ArrowLeftIcon, ExternalLinkIcon, ReceiptIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdvanceOrderButton } from "@/components/admin/advance-order-button";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/dates";
import { lineTotal } from "@/lib/money";
import { orderNumber } from "@/lib/orders/status";
import { requireAdminPage } from "@/server/auth/guards";
import {
  type AdminOrderDetail,
  getAdminOrder,
} from "@/server/services/admin-orders";

export const metadata: Metadata = { title: "Pedido" };

export default function AdminOrderPage({
  params,
}: PageProps<"/admin/pedidos/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/admin/pedidos"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Pedidos
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <OrderDetail params={params} />
      </Suspense>
    </div>
  );
}

async function OrderDetail({
  params,
}: Pick<PageProps<"/admin/pedidos/[id]">, "params">) {
  const { id } = await params;
  await requireAdminPage(`/admin/pedidos/${id}`);
  const order = await getAdminOrder(id);

  if (!order) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        headingLevel="h1"
        title="Pedido no encontrado"
        action={
          <Button asChild>
            <Link href="/admin/pedidos">Volver a pedidos</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Pedido {orderNumber(order.id)}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Creado el {formatDateTime(order.createdAt)}
          </p>
        </div>
        <AdvanceOrderButton orderId={order.id} status={order.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="articulos" className="rounded-lg border">
          <h2 id="articulos" className="border-b px-4 py-3 font-medium">
            Artículos
          </h2>
          <ul className="divide-y">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
              >
                <div className="flex flex-col">
                  <Link
                    href={`/admin/productos/${item.variant.product.id}`}
                    className="font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {item.variant.sku ? `SKU ${item.variant.sku} · ` : ""}
                    {item.quantity} × <Price cents={item.price} />
                  </span>
                </div>
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

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="cliente"
            className="flex flex-col gap-2 rounded-lg border p-4 text-sm"
          >
            <h2 id="cliente" className="font-medium">
              Cliente
            </h2>
            <p>
              {order.shippingName ?? order.user?.name ?? "Invitado"}
              {!order.user && (
                <span className="text-muted-foreground"> (invitado)</span>
              )}
            </p>
            {order.email ? (
              <a
                href={`mailto:${order.email}`}
                className="w-fit text-muted-foreground hover:text-foreground hover:underline"
              >
                {order.email}
              </a>
            ) : (
              <p className="text-muted-foreground">
                Sin correo (el pago no se completó)
              </p>
            )}
          </section>

          <section
            aria-labelledby="envio"
            className="flex flex-col gap-2 rounded-lg border p-4 text-sm"
          >
            <h2 id="envio" className="font-medium">
              Dirección de envío
            </h2>
            <ShippingAddress order={order} />
          </section>

          <section
            aria-labelledby="historial"
            className="flex flex-col gap-2 rounded-lg border p-4 text-sm"
          >
            <h2 id="historial" className="font-medium">
              Historial
            </h2>
            <ol className="flex flex-col gap-1.5">
              <TimelineItem label="Creado" date={order.createdAt} />
              <TimelineItem label="Pagado" date={order.paidAt} />
              <TimelineItem label="Enviado" date={order.shippedAt} />
              <TimelineItem label="Entregado" date={order.deliveredAt} />
            </ol>
            {order.paymentIntentId && (
              <a
                href={`https://dashboard.stripe.com/test/payments/${order.paymentIntentId}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex w-fit items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
              >
                Ver el pago en Stripe
                <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </a>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ShippingAddress({ order }: { order: AdminOrderDetail }) {
  if (!order.shippingLine1) {
    return (
      <p className="text-muted-foreground">
        Sin dirección (se recoge al pagar).
      </p>
    );
  }
  return (
    <address className="text-muted-foreground not-italic">
      {order.shippingName && (
        <span className="block text-foreground">{order.shippingName}</span>
      )}
      <span className="block">{order.shippingLine1}</span>
      {order.shippingLine2 && (
        <span className="block">{order.shippingLine2}</span>
      )}
      <span className="block">
        {[order.shippingZip, order.shippingCity].filter(Boolean).join(" ")}
      </span>
      <span className="block">
        {[order.shippingState, order.shippingCountry]
          .filter(Boolean)
          .join(", ")}
      </span>
    </address>
  );
}

function TimelineItem({ label, date }: { label: string; date: Date | null }) {
  return (
    <li className="flex justify-between gap-3">
      <span className={date ? "" : "text-muted-foreground"}>{label}</span>
      <span className="text-muted-foreground tabular-nums">
        {date ? formatDateTime(date) : "—"}
      </span>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label="Cargando pedido"
    >
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
