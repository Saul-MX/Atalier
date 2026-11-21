"use client";

import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { catalogHref } from "@/lib/catalog/filters-url";
import { type CategorySummary } from "@/lib/catalog/types";

/** Panel del menú móvil (carga diferida desde MobileNav). */
export function MobileNavSheet({
  categories,
  open,
  onOpenChange,
  returnFocusRef,
}: {
  categories: CategorySummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-80"
        // Sin SheetTrigger, Radix no sabe a dónde devolver el foco.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <SheetHeader className="border-b">
          <SheetTitle>Menú</SheetTitle>
          <SheetDescription className="sr-only">
            Navegación principal de la tienda
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Principal (móvil)" className="px-4">
          <ul className="flex flex-col">
            <li>
              <Link
                href="/catalogo"
                onClick={close}
                className="block py-3 text-base font-medium"
              >
                Ver todo
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={catalogHref({ category: category.slug })}
                  onClick={close}
                  className="block py-3 text-base"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
