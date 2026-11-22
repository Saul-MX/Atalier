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
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85">
      <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[4.75rem]">
        <div className="flex items-center">
          <MobileNav categories={categories} />
          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-7 label-caps">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={catalogHref({ category: category.slug })}
                    className="underline-offset-4 hover:underline"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Link
          href="/"
          className="pl-[0.3em] text-lg display-caps lg:text-[1.375rem]"
          aria-label="ATELIER, ir al inicio"
        >
          ATELIER
        </Link>

        <div className="flex items-center justify-end sm:gap-1 lg:gap-6">
          <SearchLauncher />
          <UserMenu />
          <CartButton />
        </div>
      </Container>
    </header>
  );
}
