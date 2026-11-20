"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { catalogHref } from "@/lib/catalog/filters";
import { type CategorySummary } from "@/lib/catalog/types";

export function MobileNav({ categories }: { categories: CategorySummary[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="lg:hidden"
          aria-label="Abrir menú"
        >
          <MenuIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
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
