"use client";

import { MenuIcon } from "lucide-react";
import { Suspense, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { type CategorySummary } from "@/lib/catalog/types";
import { lazyWithPreload } from "@/lib/lazy";

const MobileNavSheet = lazyWithPreload(() =>
  import("./mobile-nav-sheet").then((m) => m.MobileNavSheet),
);

/**
 * Botón del menú móvil. El panel lateral (Radix Sheet) se descarga al abrirlo
 * o al tocar/enfocar el botón, no en el JS inicial.
 */
export function MobileNav({ categories }: { categories: CategorySummary[] }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon-lg"
        className="lg:hidden"
        aria-label="Abrir menú"
        aria-haspopup="dialog"
        onPointerEnter={MobileNavSheet.preload}
        onFocus={MobileNavSheet.preload}
        onClick={() => {
          setRequested(true);
          setOpen(true);
        }}
      >
        <MenuIcon aria-hidden="true" />
      </Button>
      {requested && (
        <Suspense fallback={null}>
          <MobileNavSheet
            categories={categories}
            open={open}
            onOpenChange={setOpen}
            returnFocusRef={buttonRef}
          />
        </Suspense>
      )}
    </>
  );
}
