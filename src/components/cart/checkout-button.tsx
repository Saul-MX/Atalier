"use client";

import { Loader2Icon, LockIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { type CartItem, useCartStore } from "@/stores/cart";

type CheckoutError = {
  error?: string;
  variants?: { variantId: string; name: string | null; available: number }[];
};

function stockMessage(
  variants: NonNullable<CheckoutError["variants"]>,
  items: CartItem[],
): string {
  const names = variants.map((v) => {
    const item = items.find((i) => i.variantId === v.variantId);
    const label = item
      ? `${item.name} (${item.color} / ${item.size})`
      : (v.name ?? "Un artículo");
    return v.available === 0
      ? `${label} se agotó`
      : `${label}: solo quedan ${v.available}`;
  });
  return `${names.join("; ")}. Hemos ajustado tu carrito; revísalo y vuelve a pagar.`;
}

/**
 * Envía solo { variantId, quantity } a /api/checkout y redirige a Stripe.
 * El precio que se cobra lo calcula el servidor con los datos de la BD.
 */
export function CheckoutButton() {
  const items = useCartStore((state) => state.items);
  const limitToStock = useCartStore((state) => state.limitToStock);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  async function checkout() {
    setPending(true);
    setError(null);
    const showError = (message: string) => {
      setError(message);
      setPending(false);
      requestAnimationFrame(() => errorRef.current?.focus());
    };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ variantId, quantity }) => ({
            variantId,
            quantity,
          })),
        }),
      });
      const data = (await response
        .json()
        .catch(() => ({}))) as CheckoutError & {
        url?: string;
      };

      if (response.ok && data.url) {
        // Se mantiene `pending` mientras el navegador sale hacia Stripe.
        window.location.assign(data.url);
        return;
      }
      if (response.status === 409 && data.variants) {
        showError(stockMessage(data.variants, items));
        limitToStock(data.variants);
        return;
      }
      showError(
        data.error ?? "No pudimos iniciar el pago. Inténtalo de nuevo.",
      );
    } catch {
      showError("Sin conexión. Revisa tu red e inténtalo de nuevo.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <Button
        size="lg"
        className="h-11 w-full"
        disabled={pending || items.length === 0}
        onClick={checkout}
      >
        {pending ? (
          <Loader2Icon className="animate-spin" aria-hidden="true" />
        ) : (
          <LockIcon aria-hidden="true" />
        )}
        {pending ? "Redirigiendo al pago…" : "Pagar"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Pago seguro con Stripe (modo de prueba: usa la tarjeta 4242 4242 4242
        4242).
      </p>
    </div>
  );
}
