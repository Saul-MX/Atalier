import { ArrowRightIcon, LockIcon, ReceiptIcon, TruckIcon } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductGrid } from "@/components/shop/product-grid";
import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import { catalogHref } from "@/lib/catalog/filters";
import { formatPrice } from "@/lib/money";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import {
  getCategoryHighlights,
  getNewArrivals,
} from "@/server/catalog/queries";

export default async function HomePage() {
  const [newArrivals, collections] = await Promise.all([
    getNewArrivals(8),
    getCategoryHighlights(),
  ]);
  const [heroA, heroB] = newArrivals;

  return (
    <>
      {/* Hero editorial */}
      <section aria-labelledby="hero-title" className="border-b">
        <Container className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-medium tracking-[0.3em] text-muted-foreground uppercase">
              Nueva temporada
            </p>
            <h1
              id="hero-title"
              className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              Siluetas esenciales, materiales que permanecen.
            </h1>
            <p className="max-w-md text-base text-pretty text-muted-foreground">
              Lana, lino, seda y piel en una paleta serena. Prendas pensadas
              para combinarse entre sí durante muchas temporadas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href="/catalogo">
                  Explorar la colección
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5">
                <Link href="#novedades">Ver novedades</Link>
              </Button>
            </div>
          </div>

          {heroA && (
            <div className="grid grid-cols-2 gap-4" aria-hidden="true">
              <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
                <ProductImage
                  src={heroA.images[0]}
                  alt=""
                  sizes="(min-width: 768px) 25vw, 50vw"
                  preload
                />
              </div>
              {heroB && (
                <div className="relative mt-12 aspect-[3/4] overflow-hidden rounded-md bg-muted">
                  <ProductImage
                    src={heroB.images[0]}
                    alt=""
                    sizes="(min-width: 768px) 25vw, 50vw"
                    preload
                  />
                </div>
              )}
            </div>
          )}
        </Container>
      </section>

      {/* Ventajas */}
      <section aria-label="Ventajas de comprar en ATELIER" className="border-b">
        <Container>
          <ul className="grid gap-4 py-6 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-3">
              <TruckIcon className="size-5 shrink-0" aria-hidden="true" />
              Envío gratis desde {formatPrice(FREE_SHIPPING_THRESHOLD)}
            </li>
            <li className="flex items-center gap-3">
              <LockIcon className="size-5 shrink-0" aria-hidden="true" />
              Pago seguro con Stripe
            </li>
            <li className="flex items-center gap-3">
              <ReceiptIcon className="size-5 shrink-0" aria-hidden="true" />
              Precios con IVA incluido
            </li>
          </ul>
        </Container>
      </section>

      {/* Colecciones */}
      <section aria-labelledby="colecciones" className="py-16">
        <Container className="flex flex-col gap-8">
          <h2
            id="colecciones"
            className="text-2xl font-semibold tracking-tight"
          >
            Colecciones
          </h2>
          {collections.length === 0 ? (
            <EmptyState
              title="Aún no hay colecciones"
              description="Vuelve pronto: estamos preparando la nueva temporada."
              headingLevel="h3"
            />
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {collections.map((collection) => (
                <li key={collection.slug}>
                  <Link
                    href={catalogHref({ category: collection.slug })}
                    className="group relative flex aspect-[4/5] items-end overflow-hidden rounded-md bg-muted"
                  >
                    <ProductImage
                      src={collection.image}
                      alt=""
                      sizes="(min-width: 768px) 33vw, 50vw"
                      className="transition duration-700 ease-out group-hover:scale-[1.03]"
                    />
                    <span className="relative m-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-md bg-background/90 px-3 py-2 text-sm backdrop-blur">
                      <span className="font-medium">{collection.name}</span>
                      <span className="text-muted-foreground">
                        {collection.productCount}
                        <span className="sr-only"> productos</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      {/* Novedades */}
      <section
        id="novedades"
        aria-labelledby="novedades-title"
        className="scroll-mt-20 pb-8"
      >
        <Container className="flex flex-col gap-8">
          <div className="flex items-end justify-between gap-4">
            <h2
              id="novedades-title"
              className="text-2xl font-semibold tracking-tight"
            >
              Novedades
            </h2>
            <Button asChild variant="link" className="px-0">
              <Link href="/catalogo">
                Ver todo
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </div>
          {newArrivals.length === 0 ? (
            <EmptyState
              title="Todavía no hay productos"
              description="Nuestro catálogo se está preparando."
              headingLevel="h3"
            />
          ) : (
            <ProductGrid products={newArrivals} headingLevel="h3" />
          )}
        </Container>
      </section>
    </>
  );
}
