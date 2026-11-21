import Link from "next/link";

import { UserMenu } from "@/components/auth/user-menu";
import { CartButton } from "@/components/cart/cart-button";
import { Container } from "@/components/shared/container";
import { catalogHref } from "@/lib/catalog/filters";
import { getCategories } from "@/server/catalog/queries";

import { MobileNav } from "./mobile-nav";
import { SearchLauncher } from "./search-launcher";

export async function SiteHeader() {
  const categories = await getCategories();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <Container className="flex h-16 items-center gap-2">
        <MobileNav categories={categories} />

        <Link
          href="/"
          className="mr-4 text-lg font-semibold tracking-[0.3em]"
          aria-label="ATELIER, ir al inicio"
        >
          ATELIER
        </Link>

        <nav aria-label="Principal" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-6 text-sm">
            <li>
              <Link
                href="/catalogo"
                className="font-medium underline-offset-8 hover:underline"
              >
                Ver todo
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={catalogHref({ category: category.slug })}
                  className="text-muted-foreground underline-offset-8 hover:text-foreground hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchLauncher />
          <UserMenu />
          <CartButton />
        </div>
      </Container>
    </header>
  );
}
