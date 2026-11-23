import { ExternalLinkIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SiteImageEditor } from "@/components/admin/site-image-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_IMAGE_HINT, HERO_IMAGE_HINT } from "@/lib/site-images";
import { requireAdminPage } from "@/server/auth/guards";
import { getSiteContentForAdmin } from "@/server/services/site-content";

export const metadata: Metadata = { title: "Portada" };

export default function AdminHomeContentPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Portada</h1>
          <p className="text-sm text-muted-foreground">
            Imágenes del inicio de la tienda: el hero y la tarjeta de cada
            categoría.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/" target="_blank">
            Ver la portada
            <ExternalLinkIcon aria-hidden="true" />
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </Link>
        </Button>
      </header>
      <Suspense fallback={<ContentSkeleton />}>
        <SiteContent />
      </Suspense>
    </div>
  );
}

async function SiteContent() {
  await requireAdminPage("/admin/portada");
  const { hero, categories } = await getSiteContentForAdmin();

  return (
    <>
      <section
        aria-labelledby="portada-hero"
        className="flex flex-col gap-4 border-t pt-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="portada-hero" className="text-xl font-medium">
            Hero
          </h2>
          <p className="text-sm text-muted-foreground">
            Foto de fondo del bloque principal, detrás de «Esenciales». Sin
            imagen se muestra el fondo liso.
          </p>
        </div>
        <div className="max-w-2xl">
          <SiteImageEditor
            target={{ kind: "hero" }}
            label="del hero"
            image={hero}
            fallbackText="Sin imagen: fondo liso"
            shape="wide"
            hint={HERO_IMAGE_HINT}
            removeDescription="El hero volverá al fondo liso."
          />
        </div>
      </section>

      <section
        aria-labelledby="portada-categorias"
        className="flex flex-col gap-4 border-t pt-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="portada-categorias" className="text-xl font-medium">
            Categorías
          </h2>
          <p className="text-sm text-muted-foreground">
            Tarjetas de «Compra por categoría». Si una categoría no tiene imagen
            propia, la portada usa la foto de uno de sus productos.
          </p>
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguna categoría tiene productos visibles todavía: aparecerán aquí
            cuando la tienda las muestre.
          </p>
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-col gap-3">
                <h3 className="font-medium">{category.name}</h3>
                <SiteImageEditor
                  target={{ kind: "category", categoryId: category.id }}
                  label={`de ${category.name}`}
                  image={category.image}
                  fallback={category.fallback}
                  fallbackText={
                    category.fallback ? "Foto de un producto" : "Sin imagen"
                  }
                  shape="card"
                  hint={CATEGORY_IMAGE_HINT}
                  removeDescription="La tarjeta volverá a usar la foto de uno de sus productos."
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ContentSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label="Cargando portada"
    >
      <Skeleton className="aspect-video w-full max-w-2xl" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-3/4" />
        ))}
      </div>
    </div>
  );
}
