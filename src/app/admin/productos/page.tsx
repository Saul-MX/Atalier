import { PackageIcon, PlusIcon, SearchIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { ProductImage } from "@/components/shop/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminPage } from "@/server/auth/guards";
import { listAdminProducts } from "@/server/services/admin-products";

export const metadata: Metadata = { title: "Productos" };

const filtersSchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((q) => q || undefined),
  estado: z.enum(["todos", "activos", "borradores"]).catch("todos"),
  eliminado: z.literal("1").optional().catch(undefined),
});

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/productos">) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo, fotos, variantes y stock.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/productos/nuevo">
            <PlusIcon aria-hidden="true" />
            Nuevo producto
          </Link>
        </Button>
      </header>
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProductsList({
  searchParams,
}: Pick<PageProps<"/admin/productos">, "searchParams">) {
  await requireAdminPage("/admin/productos");

  const raw = await searchParams;
  const filters = filtersSchema.parse({
    q: first(raw.q),
    estado: first(raw.estado),
    eliminado: first(raw.eliminado),
  });
  const products = await listAdminProducts({
    q: filters.q,
    status: filters.estado,
  });
  const filtered = Boolean(filters.q) || filters.estado !== "todos";

  return (
    <div className="flex flex-col gap-4">
      {filters.eliminado && (
        <p
          role="status"
          className="rounded-md border bg-muted/50 px-3 py-2 text-sm"
        >
          Producto eliminado.
        </p>
      )}

      <form
        role="search"
        action="/admin/productos"
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <Label htmlFor="admin-products-q">Buscar</Label>
          <Input
            id="admin-products-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Nombre o slug"
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-products-status">Estado</Label>
          <select
            id="admin-products-status"
            name="estado"
            defaultValue={filters.estado}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="borradores">Borradores</option>
          </select>
        </div>
        <Button type="submit" variant="outline" className="h-9">
          <SearchIcon aria-hidden="true" />
          Filtrar
        </Button>
        {filtered && (
          <Button asChild variant="ghost" className="h-9">
            <Link href="/admin/productos">Limpiar</Link>
          </Button>
        )}
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title={filtered ? "Sin resultados" : "Aún no hay productos"}
          description={
            filtered
              ? "Ningún producto coincide con los filtros."
              : "Crea el primero para empezar a vender."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">{products.length} producto(s)</caption>
            <thead className="bg-muted/50 text-left">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Producto
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 font-medium md:table-cell"
                >
                  Categoría
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Precio
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Stock
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="relative aspect-3/4 w-10 shrink-0 overflow-hidden rounded-sm bg-muted">
                        <ProductImage src={product.image} alt="" sizes="40px" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <Link
                          href={`/admin/productos/${product.id}`}
                          className="font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                        <span className="truncate text-xs text-muted-foreground">
                          {product.slug}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 whitespace-nowrap md:table-cell">
                    {product.category}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Price cents={product.price} />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                    {product.variantCount === 0 ? (
                      <span className="text-muted-foreground">
                        Sin variantes
                      </span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span>{product.totalStock} uds.</span>
                        {product.outOfStock > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {product.outOfStock} de {product.variantCount}{" "}
                            agotada(s)
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {product.active ? (
                      <Badge>Activo</Badge>
                    ) : (
                      <Badge variant="outline">Borrador</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-label="Cargando productos"
    >
      <Skeleton className="h-9 w-full max-w-lg" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
