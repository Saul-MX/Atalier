"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Panel", exact: true },
  { href: "/admin/pedidos", label: "Pedidos", exact: false },
  { href: "/admin/productos", label: "Productos", exact: false },
] as const;

/**
 * `usePathname()` es dato de runtime: con cacheComponents debe ir dentro de
 * <Suspense>. El fallback (prerender) pinta los mismos enlaces sin marcar.
 */
export function AdminNav() {
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <CurrentNavLinks />
    </Suspense>
  );
}

function CurrentNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Secciones del panel">
      <ul className="flex items-center gap-1">
        {LINKS.map(({ href, label, exact }) => {
          const current =
            pathname !== null &&
            (exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  current && "bg-muted font-medium text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
