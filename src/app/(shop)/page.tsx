import { type Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductGrid } from "@/components/shop/product-grid";
import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import { catalogHref } from "@/lib/catalog/filters";
import { formatPrice } from "@/lib/money";
import { publicEnv } from "@/lib/env/public";
import { jsonLd, SITE } from "@/lib/seo";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { cn } from "@/lib/utils";
import {
  getCategoryHighlights,
  getHeroImage,
  getNewArrivals,
} from "@/server/catalog/queries";

export const metadata: Metadata = {
  title: { absolute: SITE.title },
  alternates: { canonical: "/" },
};

/** Datos estructurados del sitio: nombre y búsqueda interna (sitelinks searchbox). */
function websiteJsonLd() {
  const base = publicEnv("NEXT_PUBLIC_APP_URL");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: new URL("/", base).toString(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${new URL("/catalogo", base).toString()}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Velo detrás del texto del hero cuando hay foto: el color de fondo del tema
 * concentrado en el centro, para que el texto se lea sobre cualquier imagen
 * (claro en modo claro, oscuro en modo oscuro) sin tapar los bordes.
 */
const HERO_SCRIM = {
  background:
    "radial-gradient(ellipse 65% 60% at center, color-mix(in oklab, var(--background) 88%, transparent) 0%, color-mix(in oklab, var(--background) 62%, transparent) 55%, color-mix(in oklab, var(--background) 10%, transparent) 100%)",
};

export default async function HomePage() {
  const [newArrivals, collections, heroImage] = await Promise.all([
    getNewArrivals(4),
    getCategoryHighlights(),
    getHeroImage(),
  ]);
  // Sobre foto, los textos secundarios usan el color principal (más contraste).
  const secondaryText = heroImage ? "text-foreground" : "text-muted-foreground";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd()) }}
      />
      {/* Hero */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden bg-muted"
      >
        {heroImage && (
          <>
            <ProductImage
              src={heroImage}
              alt=""
              sizes="100vw"
              priority
              className="-z-10 motion-safe:settle"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10"
              style={HERO_SCRIM}
            />
          </>
        )}
        <Container className="flex min-h-[26rem] flex-col items-center justify-center gap-5 py-20 text-center md:min-h-[40rem]">
          <p className={cn("label-caps motion-safe:rise-in", secondaryText)}>
            Colección otoño / invierno 26
          </p>
          <h1
            id="hero-title"
            className="pl-[0.3em] text-4xl font-normal display-caps [--rise-delay:60ms] motion-safe:rise-in sm:text-5xl lg:text-[4rem]"
          >
            Esenciales
          </h1>
          <p
            className={cn(
              "max-w-md text-[0.8125rem] text-pretty [--rise-delay:160ms] motion-safe:rise-in",
              secondaryText,
            )}
          >
            Prendas atemporales, cortes limpios y accesorios en plata. Envío
            gratis desde {formatPrice(FREE_SHIPPING_THRESHOLD)}.
          </p>
          <Button
            asChild
            size="cta"
            className="mt-2 [--rise-delay:260ms] motion-safe:rise-in"
          >
            <Link href="/catalogo">Ver colección</Link>
          </Button>
        </Container>
      </section>

      {/* Categorías */}
      <section aria-labelledby="colecciones" className="pt-24">
        <Container className="flex flex-col gap-10 motion-safe:reveal">
          <h2
            id="colecciones"
            className="text-center text-base display-caps tracking-[0.15em]"
          >
            Compra por categoría
          </h2>
          {collections.length === 0 ? (
            <EmptyState
              title="Aún no hay categorías"
              description="Vuelve pronto: estamos preparando la nueva temporada."
              headingLevel="h3"
            />
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
              {collections.map((collection, index) => (
                <li key={collection.slug}>
                  <Link
                    href={catalogHref({ category: collection.slug })}
                    className="flex flex-col gap-3"
                  >
                    <span className="relative block aspect-[3/4] overflow-hidden bg-muted">
                      <ProductImage
                        src={collection.image}
                        alt=""
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        // Con foto en el hero, el LCP es ella: que las
                        // tarjetas no compitan por la prioridad alta.
                        priority={!heroImage && index < 2}
                      />
                    </span>
                    <span className="text-center label-caps">
                      {collection.name}
                      <span className="sr-only">
                        {" "}
                        ({collection.productCount} productos)
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
        className="scroll-mt-24 pt-24"
      >
        <Container className="flex flex-col items-center gap-10 motion-safe:reveal">
          <h2
            id="novedades-title"
            className="text-center text-base display-caps tracking-[0.15em]"
          >
            Novedades
          </h2>
          {newArrivals.length === 0 ? (
            <EmptyState
              title="Todavía no hay productos"
              description="Nuestro catálogo se está preparando."
              headingLevel="h3"
            />
          ) : (
            <ProductGrid
              products={newArrivals}
              headingLevel="h3"
              className="w-full"
            />
          )}
          <Button
            asChild
            variant="outline"
            size="cta"
            className="border-foreground px-8"
          >
            <Link href="/catalogo">Ver todo</Link>
          </Button>
        </Container>
      </section>
    </>
  );
}
