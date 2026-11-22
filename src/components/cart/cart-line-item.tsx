"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { Price } from "@/components/shared/price";
import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import { type CartItem, useCartStore } from "@/stores/cart";

export function CartLineItem({
  item,
  onNavigate,
}: {
  item: CartItem;
  onNavigate?: () => void;
}) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const atMax = item.quantity >= item.maxQuantity;

  return (
    <li className="flex gap-4 py-4">
      <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden bg-muted">
        <ProductImage src={item.image} alt="" sizes="80px" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/producto/${item.slug}`}
            onClick={onNavigate}
            className="text-[0.8125rem] leading-snug hover:underline"
          >
            {item.name}
          </Link>
          <Price
            cents={item.unitPrice * item.quantity}
            className="shrink-0 text-[0.8125rem]"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Color: {item.color} · Talla: {item.size}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div
            role="group"
            aria-label={`Cantidad de ${item.name}`}
            className="flex items-center border"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setQuantity(item.variantId, item.quantity - 1)}
              aria-label={
                item.quantity === 1
                  ? `Eliminar ${item.name}`
                  : `Quitar una unidad de ${item.name}`
              }
            >
              <MinusIcon aria-hidden="true" />
            </Button>
            <span
              className="min-w-8 text-center text-sm tabular-nums"
              aria-live="polite"
            >
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setQuantity(item.variantId, item.quantity + 1)}
              disabled={atMax}
              aria-label={`Añadir una unidad de ${item.name}`}
            >
              <PlusIcon aria-hidden="true" />
            </Button>
          </div>

          <Button
            variant="link"
            size="sm"
            onClick={() => removeItem(item.variantId)}
            aria-label={`Eliminar ${item.name} del carrito`}
            className="h-auto px-0 text-xs text-muted-foreground underline"
          >
            Eliminar
          </Button>
        </div>
        {atMax && (
          <p className="text-xs text-muted-foreground">
            Máximo disponible: {item.maxQuantity}
          </p>
        )}
      </div>
    </li>
  );
}
