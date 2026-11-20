import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ReceiptIcon,
  SearchIcon,
} from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { type OrderStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/dates";
import { ORDER_STATUSES, orderNumber, STATUS_LABEL } from "@/lib/orders/status";
import { cn } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth/guards";
import { listAdminOrders } from "@/server/services/admin-orders";

export const metadata: Metadata = { title: "Pedidos" };

const filtersSchema = z.object({
  estado: z.enum(ORDER_STATUSES).optional().catch(undefined),
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((q) => q || undefined),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
});
type Filters = z.infer<typeof filtersSchema>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function ordersHref(filters: Partial<Filters>) {
  const params = new URLSearchParams();
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.q) params.set("q", filters.q);
  if (filters.pagina && filters.pagina > 1)
    params.set("pagina", String(filters.pagina));
  const query = params.toString();
  return query ? `/admin/pedidos?${query}` : "/admin/pedidos";
}

/** Orden de las pestañas: primero lo que requiere acción. */
const TABS: (OrderStatus | null)[] = [
  null,
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "PENDING",
  "EXPIRED",
  "CANCELLED",
];

export default function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/pedidos">) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Marca los pedidos pagados como enviados y, después, como entregados.
        </p>
      </header>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrdersList({
  searchParams,
}: Pick<PageProps<"/admin/pedidos">, "searchParams">) {
  await requireAdminPage("/admin/pedidos");

  const raw = await searchParams;
  const filters = filtersSchema.parse({
    estado: first(raw.estado),
    q: first(raw.q),
    pagina: first(raw.pagina),
  });
  const { rows, total, pageCount, countsByStatus } = await listAdminOrders({
    status: filters.estado ?? null,
    q: filters.q,
    page: filters.pagina,
  });
  const allCount = Object.values(countsByStatus).reduce(
    (a, b) => a + (b ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filtrar por estado" className="-mx-1 overflow-x-auto">
        <ul className="flex w-max gap-1 px-1">
          {TABS.map((status) => {
            const current = (filters.estado ?? null) === status;
            const count = status ? (countsByStatus[status] ?? 0) : allCount;
            return (
              <li key={status ?? "todos"}>
                <Link
                  href={ordersHref({
                    estado: status ?? undefined,
                    q: filters.q,
                  })}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    current && "bg-muted font-medium text-foreground",
                  )}
                >
                  {status ? STATUS_LABEL[status] : "Todos"}
                  <span className="text-xs tabular-nums">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form
        role="search"
        action="/admin/pedidos"
        className="flex flex-wrap items-end gap-3"
      >
        {filters.estado && (
          <input type="hidden" name="estado" value={filters.estado} />
        )}
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <Label htmlFor="admin-orders-q">Buscar</Label>
          <Input
            id="admin-orders-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Correo, nombre o número de pedido"
            className="h-9"
          />
        </div>
        <Button type="submit" variant="outline" className="h-9">
          <SearchIcon aria-hidden="true" />
          Buscar
        </Button>
        {filters.q && (
          <Button asChild variant="ghost" className="h-9">
            <Link href={ordersHref({ estado: filters.estado })}>Limpiar</Link>
          </Button>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="No hay pedidos"
          description={
            filters.q || filters.estado
              ? "Ningún pedido coincide con los filtros."
              : "Cuando alguien compre, sus pedidos aparecerán aquí."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                {total} pedido(s)
                {filters.estado ? `, ${STATUS_LABEL[filters.estado]}` : ""}
              </caption>
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Pedido
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Cliente
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-2 font-medium md:table-cell"
                  >
                    Fecha
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {orderNumber(order.id)}
                        <span className="sr-only"> (ver detalle)</span>
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {order.units}{" "}
                        {order.units === 1 ? "artículo" : "artículos"}
                      </div>
                    </td>
                    <td className="max-w-56 px-3 py-2">
                      <div className="truncate">
                        {order.customerName ?? "Invitado"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {order.email || "Sin correo"}
                      </div>
                    </td>
                    <td className="hidden px-3 py-2 whitespace-nowrap text-muted-foreground md:table-cell">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Price cents={order.total} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <nav
              aria-label="Paginación"
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">
                Página {filters.pagina} de {pageCount}
              </span>
              <div className="flex gap-2">
                {filters.pagina > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={ordersHref({
                        ...filters,
                        pagina: filters.pagina - 1,
                      })}
                    >
                      <ChevronLeftIcon aria-hidden="true" />
                      Anterior
                    </Link>
                  </Button>
                )}
                {filters.pagina < pageCount && (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={ordersHref({
                        ...filters,
                        pagina: filters.pagina + 1,
                      })}
                    >
                      Siguiente
                      <ChevronRightIcon aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-label="Cargando pedidos"
    >
      <Skeleton className="h-9 w-full max-w-xl" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
