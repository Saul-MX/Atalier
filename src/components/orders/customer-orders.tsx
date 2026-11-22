import { PackageIcon } from "lucide-react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { lineTotal } from "@/lib/money";
import { orderNumber } from "@/lib/orders/status";
import { type CustomerOrder } from "@/server/services/orders";

/** Mensaje de seguimiento según el estado del envío. */
function trackingNote(order: CustomerOrder): string {
  if (order.deliveredAt) return `Entregado el ${formatDate(order.deliveredAt)}`;
  if (order.shippedAt) return `Enviado el ${formatDate(order.shippedAt)}`;
  return "Estamos preparando tu pedido";
}

export function CustomerOrders({ orders }: { orders: CustomerOrder[] }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={PackageIcon}
        title="Aún no tienes pedidos"
        description="Cuando completes una compra, podrás seguir su estado aquí."
        headingLevel="h3"
        action={
          <Button asChild size="cta">
            <Link href="/catalogo">Explorar el catálogo</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {orders.map((order) => (
        <li key={order.id}>
          <article aria-labelledby={`pedido-${order.id}`} className="border">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex flex-col">
                <h3 id={`pedido-${order.id}`} className="text-sm font-medium">
                  Pedido {orderNumber(order.id)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(order.paidAt ?? order.createdAt)} ·{" "}
                  {trackingNote(order)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </header>
            <ul className="divide-y text-[0.8125rem]">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4 px-4 py-2.5"
                >
                  <span className="min-w-0">
                    <Link
                      href={`/producto/${item.variant.product.slug}`}
                      className="hover:underline"
                    >
                      {item.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      × {item.quantity}
                    </span>
                  </span>
                  <Price cents={lineTotal(item.price, item.quantity)} />
                </li>
              ))}
            </ul>
            <dl className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t bg-muted px-4 py-3 text-[0.8125rem]">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Envío</dt>
                <dd>
                  {order.shippingCost === 0 ? (
                    "Gratis"
                  ) : (
                    <Price cents={order.shippingCost} />
                  )}
                </dd>
              </div>
              <div className="flex gap-2 font-medium">
                <dt>Total</dt>
                <dd>
                  <Price cents={order.total} />
                </dd>
              </div>
            </dl>
          </article>
        </li>
      ))}
    </ol>
  );
}
