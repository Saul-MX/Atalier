"use client";

import { ShoppingBagIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cartCount,
  cartSubtotal,
  takeCartReturnFocus,
  useCartStore,
} from "@/stores/cart";

import { CartLineItem } from "./cart-line-item";
import { CheckoutButton } from "./checkout-button";
import { FreeShippingBar } from "./free-shipping-bar";

export function CartDrawer() {
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const setOpen = useCartStore((state) => state.setOpen);
  const close = useCartStore((state) => state.close);
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  const count = cartCount(items);
  const subtotal = cartSubtotal(items);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        className="w-full gap-0 sm:max-w-md"
        // Sin SheetTrigger: el foco vuelve al elemento que abrió el carrito.
        onCloseAutoFocus={(event) => {
          const target = takeCartReturnFocus();
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <SheetHeader className="border-b">
          <SheetTitle>Tu carrito</SheetTitle>
          <SheetDescription>
            {hasHydrated
              ? count === 0
                ? "No tienes artículos en el carrito."
                : `${count} ${count === 1 ? "artículo" : "artículos"}`
              : "Cargando carrito…"}
          </SheetDescription>
        </SheetHeader>

        {!hasHydrated ? (
          <div className="flex flex-col gap-4 p-4" aria-hidden="true">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="aspect-[3/4] w-20 rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 items-center p-4">
            <EmptyState
              icon={ShoppingBagIcon}
              title="Tu carrito está vacío"
              description="Explora la colección y añade tus prendas favoritas."
              headingLevel="h3"
              className="w-full border-none"
              action={
                <Button asChild>
                  <Link href="/catalogo" onClick={close}>
                    Ver catálogo
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="border-b px-4 py-3">
              <FreeShippingBar subtotal={subtotal} />
            </div>
            <ul className="flex-1 divide-y overflow-y-auto px-4">
              {items.map((item) => (
                <CartLineItem
                  key={item.variantId}
                  item={item}
                  onNavigate={close}
                />
              ))}
            </ul>
            <SheetFooter className="gap-3 border-t">
              <dl className="flex items-center justify-between text-sm">
                <dt className="font-medium">Subtotal</dt>
                <dd>
                  <Price cents={subtotal} className="font-medium" />
                </dd>
              </dl>
              <p className="text-xs text-muted-foreground">
                IVA incluido. El envío se suma al pagar (gratis desde $1,500).
              </p>
              <CheckoutButton />
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
