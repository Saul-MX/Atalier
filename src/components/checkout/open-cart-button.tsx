"use client";

import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";

export function OpenCartButton() {
  const open = useCartStore((state) => state.open);
  return (
    <Button onClick={open}>
      <ShoppingBagIcon aria-hidden="true" />
      Volver al carrito
    </Button>
  );
}
