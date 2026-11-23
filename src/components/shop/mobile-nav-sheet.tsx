"use client";

import Link from "next/link";
import { useId } from "react";

import { useDarkMode } from "@/components/theme/use-dark-mode";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { catalogHref } from "@/lib/catalog/filters-url";
import { type CategorySummary } from "@/lib/catalog/types";

/** Interruptor del modo oscuro al pie del menú móvil. */
function DarkModeSwitch() {
  const id = useId();
  const { isDark, setDark } = useDarkMode();
  return (
    <div className="mt-auto flex items-center justify-between border-t px-4 py-4">
      <Label htmlFor={id} className="text-base font-normal">
        Modo oscuro
      </Label>
      <Switch id={id} checked={isDark ?? false} onCheckedChange={setDark} />
    </div>
  );
}

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
        <DarkModeSwitch />
      </SheetContent>
    </Sheet>
  );
}
