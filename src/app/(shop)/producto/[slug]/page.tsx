import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { Container } from "@/components/shared/container";
import { Price } from "@/components/shared/price";
import { ProductGrid } from "@/components/shop/product-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogHref } from "@/lib/catalog/filters";
import { publicEnv } from "@/lib/env/public";
import {
  jsonLd,
  ogImageFromProductImage,
  openGraphBase,
  productJsonLd,
  SITE,
  truncate,
} from "@/lib/seo";
import {
  getActiveProductSlugs,
  getProductBySlug,
  getRelatedProducts,
} from "@/server/catalog/queries";

export async function generateStaticParams() {
  const slugs = await getActiveProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  // Inexistente: la página llama a notFound() (Next añade noindex).
  if (!product) return { title: "Producto no encontrado" };

  const description = truncate(product.description);
  const ogImage = ogImageFromProductImage(product.images[0]?.url);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      // Sin foto real (placeholders SVG) se usa la imagen OG del sitio.
      ...openGraphBase(
        ogImage
          ? [{ url: ogImage, width: 1200, height: 630, alt: product.name }]
          : undefined,
      ),
      title: `${product.name} · ${SITE.name}`,
      description,
      url: `/producto/${product.slug}`,
    },
  };
}

export default function ProductPage({ params }: PageProps<"/producto/[slug]">) {
  return (
    <Container className="py-8">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetail params={params} />
      </Suspense>
    </Container>
  );
}

async function ProductDetail({
  params,
}: Pick<PageProps<"/producto/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.category.slug, product.slug);
  const appUrl = publicEnv("NEXT_PUBLIC_APP_URL");
  const structuredData = productJsonLd({
    url: new URL(`/producto/${product.slug}`, appUrl).toString(),
    name: product.name,
    description: product.description,
    images: product.images.map((image) =>
      new URL(image.url, appUrl).toString(),
    ),
    price: product.price,
    inStock: product.variants.some((variant) => variant.stock > 0),
    category: product.category.name,
  });

  return (
    <div className="flex flex-col gap-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <nav aria-label="Ruta de navegación">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={catalogHref({ category: product.category.slug })}
              className="hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span aria-current="page" className="text-foreground">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          <header className="flex flex-col gap-3">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              {product.category.name}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              {product.name}
            </h1>
            <p className="text-xl">
              <Price cents={product.price} />
              <span className="ml-2 text-sm text-muted-foreground">
                IVA incluido
              </span>
            </p>
          </header>

          <ProductPurchase
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.images[0]?.url ?? null,
              variants: product.variants,
            }}
          />

          <section aria-labelledby="descripcion" className="border-t pt-6">
            <h2 id="descripcion" className="mb-2 text-sm font-medium">
              Descripción
            </h2>
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {product.description}
            </p>
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="relacionados" className="flex flex-col gap-6">
          <h2
            id="relacionados"
            className="text-2xl font-semibold tracking-tight"
          >
            También te puede gustar
          </h2>
          <ProductGrid products={related} headingLevel="h3" />
        </section>
      )}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div
      className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16"
      role="status"
      aria-label="Cargando producto"
    >
      <Skeleton className="aspect-3/4 w-full rounded-md" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-6 w-28" />
        <div className="mt-4 flex gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="size-9 rounded-full" />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-12" />
          ))}
        </div>
        <Skeleton className="mt-2 h-12 w-full" />
      </div>
    </div>
  );
}
