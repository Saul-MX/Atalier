import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  PackageCheckIcon,
} from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SalesChart } from "@/components/admin/sales-chart";
import { Price } from "@/components/shared/price";
import { Skeleton } from "@/components/ui/skeleton";
import { LOW_STOCK_THRESHOLD } from "@/lib/catalog/variants";
import { formatPrice } from "@/lib/money";
import { requireAdminPage } from "@/server/auth/guards";
import {
  type DashboardMetrics,
  getDashboardMetrics,
} from "@/server/services/admin-orders";

export const metadata: Metadata = { title: "Panel" };

export default function AdminHomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  // Verificación real del rol en la propia página (no solo en el layout/proxy).
  const { user } = await requireAdminPage("/admin");
  const metrics = await getDashboardMetrics();
  const average =
    metrics.orders30 > 0 ? Math.round(metrics.revenue30 / metrics.orders30) : 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Hola, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen de los últimos 30 días.
        </p>
      </header>

      <section aria-labelledby="indicadores">
        <h2 id="indicadores" className="sr-only">
          Indicadores
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label="Ingresos (30 días)"
            value={formatPrice(metrics.revenue30)}
          >
            <RevenueDelta
              current={metrics.revenue30}
              previous={metrics.revenuePrev30}
            />
          </StatTile>
          <StatTile label="Pedidos (30 días)" value={String(metrics.orders30)}>
            <span>Pagados, enviados o entregados</span>
          </StatTile>
          <StatTile
            label="Ticket medio"
            value={average > 0 ? formatPrice(average) : "—"}
          >
            <span>Ingresos ÷ pedidos</span>
          </StatTile>
          <StatTile label="Por enviar" value={String(metrics.toShip)}>
            <Link
              href="/admin/pedidos?estado=PAID"
              className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
            >
              Ver pedidos pagados
              <ArrowRightIcon className="size-3" aria-hidden="true" />
            </Link>
          </StatTile>
        </dl>
      </section>

      <section
        aria-labelledby="ventas"
        className="flex flex-col gap-4 rounded-lg border p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ventas" className="font-medium">
            Ventas por día
          </h2>
          <p className="text-xs text-muted-foreground">
            MXN, por fecha de pago (hora de Ciudad de México)
          </p>
        </div>
        {metrics.revenue30 === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay ventas en los últimos 30 días.
          </p>
        ) : (
          <SalesChart series={metrics.series} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <LowStock metrics={metrics} />
        <section
          aria-labelledby="actividad"
          className="flex flex-col gap-3 rounded-lg border p-4 sm:p-5"
        >
          <h2 id="actividad" className="font-medium">
            Checkouts en curso
          </h2>
          <p className="text-sm text-muted-foreground">
            {metrics.pendingPayment === 0
              ? "No hay pagos pendientes."
              : `${metrics.pendingPayment} ${metrics.pendingPayment === 1 ? "cliente está" : "clientes están"} en el pago de Stripe. Su stock está reservado hasta que paguen o expire la sesión (30 min).`}
          </p>
          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link
              href="/admin/pedidos"
              className="inline-flex items-center gap-1 hover:underline"
            >
              Todos los pedidos{" "}
              <ArrowRightIcon className="size-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/admin/productos"
              className="inline-flex items-center gap-1 hover:underline"
            >
              Productos{" "}
              <ArrowRightIcon className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </dd>
      <dd className="text-xs text-muted-foreground">{children}</dd>
    </div>
  );
}

/** Variación frente a los 30 días anteriores: flecha + texto (no solo color). */
function RevenueDelta({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0) {
    return <span>Sin ventas en los 30 días anteriores</span>;
  }
  const change = Math.round(((current - previous) / previous) * 100);
  const Icon = change >= 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3.5" aria-hidden="true" />
      {change >= 0 ? "+" : "−"}
      {Math.abs(change)} % frente a los 30 días anteriores (
      <Price cents={previous} />)
    </span>
  );
}

function LowStock({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <section
      aria-labelledby="stock-bajo"
      className="flex flex-col gap-3 rounded-lg border p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="stock-bajo" className="font-medium">
          Stock bajo
        </h2>
        <span className="text-xs text-muted-foreground">
          {metrics.lowStockTotal} variante(s) con {LOW_STOCK_THRESHOLD} uds. o
          menos
        </span>
      </div>
      {metrics.lowStock.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <PackageCheckIcon className="size-4" aria-hidden="true" />
          Todas las variantes tienen stock suficiente.
        </p>
      ) : (
        <ul className="divide-y text-sm">
          {metrics.lowStock.map((variant) => (
            <li
              key={variant.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <Link
                href={`/admin/productos/${variant.productId}`}
                className="min-w-0 truncate hover:underline"
              >
                {variant.productName}
                <span className="text-muted-foreground">
                  {" "}
                  · {variant.color} / {variant.size}
                </span>
              </Link>
              <span className="shrink-0 tabular-nums">
                {variant.stock === 0 ? (
                  <span className="font-medium">Agotado</span>
                ) : (
                  `${variant.stock} uds.`
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="flex flex-col gap-8"
      role="status"
      aria-label="Cargando panel"
    >
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
