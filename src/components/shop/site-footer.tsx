import Link from "next/link";

import { Container } from "@/components/shared/container";
import { catalogHref } from "@/lib/catalog/filters";
import { formatPrice } from "@/lib/money";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { getCategories } from "@/server/catalog/queries";

export async function SiteFooter() {
  const categories = await getCategories();

  return (
    <footer className="mt-24">
      <Container>
        <div className="grid gap-10 border-t py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3 lg:col-span-2">
            <p className="text-lg display-caps">ATELIER</p>
            <p className="max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
              Ropa esencial y accesorios para mujer y hombre. Envío gratis en
              pedidos desde {formatPrice(FREE_SHIPPING_THRESHOLD)}.
            </p>
          </div>

          <nav aria-label="Categorías">
            <h2 className="mb-4 label-caps font-medium">Tienda</h2>
            <ul className="flex flex-col gap-2.5 text-[0.8125rem] text-muted-foreground">
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
            <h2 className="mb-4 label-caps font-medium">Sobre este proyecto</h2>
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
              Tienda de demostración para portfolio. Los pagos se procesan con
              Stripe en modo de prueba: no se realizan cargos reales.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pb-10 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          {/* Sin año: new Date() rompería el prerenderizado (cacheComponents). */}
          <p>© ATELIER · México · MXN</p>
          <p>Tienda de demostración · pagos simulados</p>
        </div>
      </Container>
    </footer>
  );
}
