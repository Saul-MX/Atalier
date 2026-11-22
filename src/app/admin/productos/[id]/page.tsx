import { ArrowLeftIcon, ExternalLinkIcon, PackageXIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { ImageManager } from "@/components/admin/image-manager";
import { ProductForm } from "@/components/admin/product-form";
import { VariantMatrix } from "@/components/admin/variant-matrix";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminPage } from "@/server/auth/guards";
import {
  type AdminProduct,
  getAdminProduct,
  getCategoryOptions,
} from "@/server/services/admin-products";

export const metadata: Metadata = { title: "Editar producto" };

export default function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/productos/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/admin/productos"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Productos
      </Link>
      <Suspense fallback={<EditSkeleton />}>
        <EditProduct params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditProduct({
  params,
  searchParams,
}: Pick<PageProps<"/admin/productos/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  await requireAdminPage(`/admin/productos/${id}`);

  const [product, categories, query] = await Promise.all([
    getAdminProduct(id),
    getCategoryOptions(),
    searchParams,
  ]);

  if (!product) {
    return (
      <EmptyState
        icon={PackageXIcon}
        headingLevel="h1"
        title="Producto no encontrado"
        description="Puede que se haya eliminado."
        action={
          <Button asChild>
            <Link href="/admin/productos">Volver a productos</Link>
          </Button>
        }
      />
    );
  }

  const justCreated = query.creado === "1";
  const warnings = readinessWarnings(product);
  // Remonta la matriz cuando cambian los datos guardados en el servidor.
  const variantsVersion = product.variants
    .map((v) => `${v.id}:${v.stock}:${v.colorHex}`)
    .join("|");
  // Primera foto de cada color, para la columna «Foto» de la matriz.
  const colorPhotos: Record<string, string> = {};
  for (const image of product.images) {
    if (image.color && !(image.color in colorPhotos))
      colorPhotos[image.color] = image.url;
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {product.name}
            </h1>
            {product.active ? (
              <Badge>Activo</Badge>
            ) : (
              <Badge variant="outline">Borrador</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            /producto/{product.slug}
          </p>
        </div>
        {product.active && (
          <Button asChild variant="outline">
            <Link href={`/producto/${product.slug}`} target="_blank">
              Ver en la tienda
              <ExternalLinkIcon aria-hidden="true" />
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </Link>
          </Button>
        )}
      </header>

      {(justCreated || warnings.length > 0) && (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-md border bg-muted/50 px-4 py-3 text-sm"
        >
          {justCreated && (
            <p className="font-medium">Producto creado como borrador.</p>
          )}
          {warnings.length > 0 && (
            <ul className="list-disc pl-5 text-muted-foreground">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Section
        title="Datos"
        description="Nombre, precio, categoría y visibilidad."
      >
        <ProductForm
          categories={categories}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price,
            categoryId: product.categoryId,
            active: product.active,
          }}
        />
      </Section>

      <Section
        title="Fotos"
        description="Se suben directamente a Cloudinary. La primera es la principal y cada una puede asignarse a un color."
      >
        <ImageManager
          productId={product.id}
          productName={product.name}
          images={product.images}
          colors={[...new Set(product.variants.map((v) => v.color))]}
        />
      </Section>

      <Section
        title="Variantes y stock"
        description="Cada combinación de color y talla es una variante con su propio stock."
      >
        <VariantMatrix
          key={variantsVersion}
          productId={product.id}
          variants={product.variants}
          colorPhotos={colorPhotos}
        />
      </Section>

      <Section title="Zona de peligro">
        {product.hasOrders ? (
          <p className="text-sm text-muted-foreground">
            Este producto tiene pedidos, así que no se puede eliminar. Para
            retirarlo de la tienda, desactiva «Visible en la tienda».
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Elimina el producto, sus variantes y sus fotos.
            </p>
            <DeleteProductButton
              productId={product.id}
              productName={product.name}
            />
          </div>
        )}
      </Section>
    </div>
  );
}

function readinessWarnings(product: AdminProduct): string[] {
  const warnings: string[] = [];
  const realImages = product.images.filter((image) => !image.isPlaceholder);
  if (realImages.length === 0) {
    warnings.push(
      product.images.length > 0
        ? "Solo tiene imágenes provisionales: sube las fotos reales."
        : "No tiene fotos.",
    );
  }
  if (product.variants.length === 0) {
    warnings.push("No tiene variantes: no se puede comprar.");
  } else if (product.variants.every((v) => v.stock === 0)) {
    warnings.push("Todas sus variantes están agotadas.");
  }
  if (!product.active) {
    warnings.push("Es un borrador: actívalo en «Datos» cuando esté listo.");
  }
  return warnings;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const headingId = `seccion-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 border-t pt-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-xl font-medium">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function EditSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label="Cargando producto"
    >
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
