import { SearchXIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ActiveFilters } from "@/components/catalog/active-filters";
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
    ? `${category.name} en ATELIER: prendas atemporales y cortes limpios. Filtra por color, talla y precio.`
    : "Ropa para mujer y hombre, gorras y joyería en plata. Filtra por categoría, color, talla y precio.";

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
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogContent searchParams={searchParams} />
    </Suspense>
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
  // La categoría no cuenta: se elige con las pestañas, no en el panel.
  const activeCount =
    (filters.q ? 1 : 0) +
    filters.colors.length +
    filters.sizes.length +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0);

  return (
    <CatalogNavigationProvider>
      <header className="border-b">
        <Container className="flex flex-col items-center gap-4 pt-10 text-center">
          <nav aria-label="Ruta de navegación">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                {category ? (
                  <Link href="/catalogo" className="hover:text-foreground">
                    Catálogo
                  </Link>
                ) : (
                  <span aria-current="page">Catálogo</span>
                )}
              </li>
              {category && (
                <>
                  <li aria-hidden="true">/</li>
                  <li>
                    <span aria-current="page">{category.name}</span>
                  </li>
                </>
              )}
            </ol>
          </nav>
          <h1
            className={
              filters.q
                ? "text-2xl font-normal"
                : "pl-[0.3em] text-2xl font-normal display-caps sm:text-[1.75rem]"
            }
          >
            {title}
          </h1>
          <nav
            aria-label="Categorías del catálogo"
            className="-mb-px w-full overflow-x-auto"
          >
            <ul className="mx-auto flex w-max gap-7 px-2 pb-4 label-caps">
              <li>
                <Link
                  href={catalogHref({ sort: filters.sort })}
                  aria-current={!filters.category ? "page" : undefined}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline"
                >
                  Todo
                </Link>
              </li>
              {facets.categories.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={catalogHref({
                      category: item.slug,
                      sort: filters.sort,
                    })}
                    aria-current={
                      item.slug === filters.category ? "page" : undefined
                    }
                    className="text-muted-foreground underline-offset-4 hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </header>

      <Container>
        <section
          aria-labelledby="catalogo-productos"
          className="flex flex-col gap-6 pt-5"
        >
          <h2 id="catalogo-productos" className="sr-only">
            Productos
          </h2>
          <CatalogToolbar
            filters={filters}
            facets={facets}
            activeCount={activeCount}
            total={data.total}
          />
          <ActiveFilters filters={filters} />

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
                className="pt-6"
              />
            )}
          </CatalogResults>

          <Pagination filters={filters} pageCount={data.pageCount} />
        </section>
      </Container>
    </CatalogNavigationProvider>
  );
}

function CatalogSkeleton() {
  return (
    <>
      <div className="flex flex-col items-center gap-4 border-b pt-10 pb-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Container className="flex flex-col gap-6 pt-5">
        <Skeleton className="h-9 w-full" />
        <ProductGridSkeleton count={8} className="pt-6" />
      </Container>
    </>
  );
}
