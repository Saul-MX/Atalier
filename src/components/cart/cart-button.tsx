"use client";

import { ShoppingBagIcon } from "lucide-react";

import {
  HEADER_ACTION_CLASS,
  HEADER_ICON_CLASS,
  HEADER_LABEL_CLASS,
} from "@/components/shop/header-action";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cartCount, useCartStore } from "@/stores/cart";

import { CartDrawerLazy } from "./lazy-cart-drawer";

export function CartButton() {
  const count = useCartStore((state) => cartCount(state.items));
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const open = useCartStore((state) => state.open);

  // El nombre accesible empieza por el texto visible ("Carrito"), WCAG 2.5.3.
  const label = !hasHydrated
    ? "Carrito"
    : count === 0
      ? "Carrito (vacío)"
      : `Carrito (${count} ${count === 1 ? "artículo" : "artículos"})`;

  return (
    <Button
      variant="ghost"
      className={cn("relative", HEADER_ACTION_CLASS)}
      onClick={open}
      onPointerEnter={CartDrawerLazy.preload}
      onFocus={CartDrawerLazy.preload}
      aria-label={label}
      aria-haspopup="dialog"
    >
      <ShoppingBagIcon aria-hidden="true" className={HEADER_ICON_CLASS} />
      <span
        aria-hidden="true"
        className={cn(HEADER_LABEL_CLASS, "tabular-nums")}
      >
        Carrito ({hasHydrated ? count : 0})
      </span>
      {hasHydrated && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[0.65rem] font-semibold text-primary-foreground tabular-nums lg:hidden"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
