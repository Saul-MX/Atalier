import Link from "next/link";

import { Container } from "@/components/shared/container";
import { catalogHref } from "@/lib/catalog/filters";
import { formatPrice } from "@/lib/money";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { getCategories } from "@/server/catalog/queries";

export async function SiteFooter() {
  const categories = await getCategories();

  return (
    <footer className="mt-24 border-t bg-secondary/40">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <p className="text-lg font-semibold tracking-[0.3em]">ATELIER</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Moda contemporánea con siluetas esenciales y materiales nobles.
            Envío gratis en pedidos desde {formatPrice(FREE_SHIPPING_THRESHOLD)}
            .
          </p>
        </div>

        <nav aria-label="Categorías">
          <h2 className="mb-3 text-sm font-medium">Tienda</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/catalogo" className="hover:text-foreground">
                Ver todo
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={catalogHref({ category: category.slug })}
                  className="hover:text-foreground"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 text-sm font-medium">Sobre este proyecto</h2>
          <p className="text-sm text-muted-foreground">
            Tienda de demostración para portfolio. Los pagos se procesan con
            Stripe en modo de prueba: no se realizan cargos reales.
          </p>
        </div>
      </Container>
    </footer>
  );
}
