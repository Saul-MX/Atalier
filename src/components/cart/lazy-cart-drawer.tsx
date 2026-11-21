"use client";

import { Suspense, useState } from "react";

import { lazyWithPreload } from "@/lib/lazy";
import { useCartStore } from "@/stores/cart";

export const CartDrawerLazy = lazyWithPreload(() =>
  import("./cart-drawer").then((m) => m.CartDrawer),
);

/**
 * El drawer del carrito (Radix Sheet, botón de pago…) no va en el JS inicial
 * de cada página: se monta la primera vez que se abre y queda montado.
 * CartButton lo precarga al pasar el puntero o enfocar el botón.
 */
export function LazyCartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const [mounted, setMounted] = useState(false);
  // Ajuste de estado durante el render (patrón recomendado por React).
  if (isOpen && !mounted) setMounted(true);

  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <CartDrawerLazy />
    </Suspense>
  );
}
