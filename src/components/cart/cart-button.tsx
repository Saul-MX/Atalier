"use client";

import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cartCount, useCartStore } from "@/stores/cart";

export function CartButton() {
  const count = useCartStore((state) => cartCount(state.items));
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const open = useCartStore((state) => state.open);

  const label = !hasHydrated
    ? "Abrir carrito"
    : count === 0
      ? "Abrir carrito (vacío)"
      : `Abrir carrito (${count} ${count === 1 ? "artículo" : "artículos"})`;

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="relative"
      onClick={open}
      aria-label={label}
      aria-haspopup="dialog"
    >
      <ShoppingBagIcon aria-hidden="true" />
      {hasHydrated && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[0.65rem] font-semibold text-primary-foreground tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
