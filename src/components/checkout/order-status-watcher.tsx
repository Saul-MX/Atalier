"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCartStore } from "@/stores/cart";

/** Vacía el carrito una vez confirmado el pago (orden PAID). */
export function ClearCartOnPaid() {
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const clear = useCartStore((state) => state.clear);

  useEffect(() => {
    // Tras hidratar, para que el localStorage no vuelva a rellenarlo.
    if (hasHydrated) clear();
  }, [hasHydrated, clear]);

  return null;
}

/**
 * Mientras el webhook no confirma el pago, la orden sigue PENDING: se vuelve
 * a pedir la página cada pocos segundos (sin escribir nada en el servidor).
 */
export function RefreshWhilePending({
  intervalMs = 2500,
  maxAttempts = 12,
}: {
  intervalMs?: number;
  maxAttempts?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (attempts > maxAttempts) window.clearInterval(timer);
      else router.refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [router, intervalMs, maxAttempts]);

  return null;
}
