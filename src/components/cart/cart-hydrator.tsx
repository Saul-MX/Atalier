"use client";

import { useEffect } from "react";

import { useCartStore } from "@/stores/cart";

/**
 * Carga el carrito desde localStorage después del primer render (evita
 * desajustes de hidratación) y lo mantiene sincronizado entre pestañas.
 */
export function CartHydrator() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();

    const onStorage = (event: StorageEvent) => {
      if (event.key === useCartStore.persist.getOptions().name) {
        void useCartStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
