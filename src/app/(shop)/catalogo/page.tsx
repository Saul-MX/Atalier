import { SearchXIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ActiveFilters } from "@/components/catalog/active-filters";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import {
  CatalogNavigationProvider,
  CatalogResults,
} from "@/components/catalog/catalog-navigation";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { Pagination } from "@/components/catalog/pagination";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/shop/product-grid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  catalogHref,
  hasActiveFilters,
  parseCatalogFilters,
} from "@/lib/catalog/filters";
import { catalogIndexing, openGraphBase } from "@/lib/seo";
import {
  getCatalogFacets,
  getCatalogPage,
  getCategories,
} from "@/server/catalog/queries";

export async function generateMetadata({
  searchParams,
}: PageProps<"/catalogo">): Promise<Metadata> {
  const filters = parseCatalogFilters(await searchParams);
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === filters.category);
  const { index, canonical } = catalogIndexing(filters);

  const title = filters.q
    ? `Resultados para «${filters.q}»`
    : (category?.name ?? "Catálogo");
  const description = category
    ? `${category.name} de ATELIER: siluetas esenciales y materiales nobles. Filtra por color, talla y precio.`
    : "Abrigos, camisas, punto, pantalones, vestidos y accesorios. Filtra por categoría, color, talla y precio.";

  return {
    title: filters.page > 1 ? `${title} — página ${filters.page}` : title,
    description,
    alternates: { canonical },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: {
      ...openGraphBase(),
      title: `${title} · ATELIER`,
      description,
      url: canonical,
    },
  };
}

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <Container className="py-10">
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogContent searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function CatalogContent({
  searchParams,
}: Pick<PageProps<"/catalogo">, "searchParams">) {
  const filters = parseCatalogFilters(await searchParams);
  const [facets, data] = await Promise.all([
    getCatalogFacets(),
    getCatalogPage(filters),
  ]);

  const category = facets.categories.find((c) => c.slug === filters.category);
  const title = filters.q
    ? `Resultados para «${filters.q}»`
    : (category?.name ?? "Catálogo");
  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.q ? 1 : 0) +
    filters.colors.length +
    filters.sizes.length +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0);

  return (
    <CatalogNavigationProvider>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground" role="status">
            {data.total === 1 ? "1 producto" : `${data.total} productos`}
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
          <aside aria-label="Filtros" className="hidden lg:block">
            <h2 className="sr-only">Filtros</h2>
            <CatalogFilters filters={filters} facets={facets} />
          </aside>

          <section
            aria-labelledby="catalogo-productos"
            className="flex flex-col gap-6"
          >
            {/* Siempre visible para lectores: en móvil el h2 de filtros está oculto. */}
            <h2 id="catalogo-productos" className="sr-only">
              Productos
            </h2>
            <CatalogToolbar
              filters={filters}
              facets={facets}
              activeCount={activeCount}
            />
            <ActiveFilters filters={filters} facets={facets} />

            <CatalogResults>
              {data.items.length === 0 ? (
                <EmptyState
                  icon={SearchXIcon}
                  title={
                    filters.page > data.pageCount
                      ? "Esta página no existe"
                      : "No encontramos productos"
                  }
                  description={
                    hasActiveFilters(filters)
                      ? "Prueba con otros filtros o elimina alguno para ver más resultados."
                      : "Todavía no hay productos en el catálogo."
                  }
                  action={
                    hasActiveFilters(filters) || filters.page > 1 ? (
                      <Button asChild variant="outline">
                        <Link href={catalogHref({ sort: filters.sort })}>
                          Limpiar filtros
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <ProductGrid
                  products={data.items}
                  headingLevel="h3"
                  priorityCount={2}
                  className="lg:grid-cols-3"
                />
              )}
            </CatalogResults>

            <Pagination filters={filters} pageCount={data.pageCount} />
          </section>
        </div>
      </div>
    </CatalogNavigationProvider>
  );
}

function CatalogSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <div className="hidden flex-col gap-3 lg:flex" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
        <ProductGridSkeleton count={6} className="lg:grid-cols-3" />
      </div>
    </div>
  );
}
