"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { imagesForColor } from "@/lib/catalog/product-images";
import { type ModelSibling } from "@/lib/catalog/types";
import {
  colorOptions,
  defaultColor,
  findVariant,
  LOW_STOCK_THRESHOLD,
  maxQuantityFor,
  sizeOptionsFor,
  totalStock,
  type VariantOption,
} from "@/lib/catalog/variants";
import { formatPrice } from "@/lib/money";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";

import { useProductColor } from "./product-color";
import { SizeGuideDialog } from "./size-guide-dialog";

export type PurchaseProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  /** Para la miniatura del carrito: la primera foto del color elegido. */
  images: { url: string; color: string | null }[];
  variants: VariantOption[];
  /** El mismo modelo en otros colores: sus muestras enlazan a ese producto. */
  siblings?: ModelSibling[];
};

/** Selector de variantes dependiente (color → tallas con stock) + añadir al carrito. */
export function ProductPurchase({ product }: { product: PurchaseProduct }) {
  const id = useId();
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.open);
  const sizeGroupRef = useRef<HTMLFieldSetElement>(null);

  const colors = colorOptions(product.variants);
  const { color, setColor } = useProductColor(
    defaultColor(product.variants) ?? "",
  );
  const sizes = sizeOptionsFor(product.variants, color);
  const isOneSize = sizes.length === 1 && sizes[0]?.size === "Única";

  const [size, setSize] = useState<string | null>(() =>
    isOneSize && sizes[0]?.available ? sizes[0].size : null,
  );
  const [error, setError] = useState<string | null>(null);

  const soldOut = totalStock(product.variants) === 0;
  const colorSoldOut = sizes.every((s) => !s.available);
  const variant = size ? findVariant(product.variants, color, size) : undefined;

  const selectColor = (next: string) => {
    setColor(next);
    setError(null);
    const nextSizes = sizeOptionsFor(product.variants, next);
    // Conserva la talla si sigue disponible en el nuevo color.
    const keep = nextSizes.find((s) => s.size === size && s.available);
    const only =
      nextSizes.length === 1 && nextSizes[0]?.available
        ? nextSizes[0]
        : undefined;
    setSize(keep?.size ?? only?.size ?? null);
  };

  const add = () => {
    if (!variant) {
      setError("Selecciona una talla.");
      sizeGroupRef.current
        ?.querySelector<HTMLInputElement>("input:not(:disabled)")
        ?.focus();
      return;
    }
    const result = addItem({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      color: variant.color,
      size: variant.size,
      image: imagesForColor(product.images, variant.color)[0]?.url ?? null,
      unitPrice: product.price,
      maxQuantity: maxQuantityFor(variant.stock),
    });

    if (result === "unavailable") {
      toast.error("Esta talla ya no está disponible.");
      return;
    }
    if (result === "capped") {
      toast.info(
        `Ya tienes la cantidad máxima disponible (${maxQuantityFor(variant.stock)}) en tu carrito.`,
      );
    }
    openCart();
  };

  const errorId = `${id}-size-error`;

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-3 label-caps">Color: {color}</legend>
        <div className="flex flex-wrap gap-3">
          {colors.map((option) => {
            const inputId = `${id}-color-${option.name}`;
            return (
              <div key={option.name}>
                <input
                  id={inputId}
                  type="radio"
                  name={`${id}-color`}
                  value={option.name}
                  checked={color === option.name}
                  onChange={() => selectColor(option.name)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={inputId}
                  title={
                    option.available ? option.name : `${option.name} (agotado)`
                  }
                  className={cn(
                    "relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-transparent p-0.5 peer-checked:border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                    !option.available && "opacity-60",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="size-full rounded-full border border-foreground/20"
                    style={{ backgroundColor: option.hex ?? undefined }}
                  />
                  {!option.available && (
                    <span
                      aria-hidden="true"
                      className="absolute h-px w-8 rotate-45 bg-foreground/60"
                    />
                  )}
                  <span className="sr-only">
                    {option.name}
                    {!option.available && ", agotado"}
                  </span>
                </label>
              </div>
            );
          })}
          {product.siblings?.map((sibling) => (
            <Link
              key={sibling.slug}
              href={`/producto/${sibling.slug}`}
              title={
                sibling.available ? sibling.color : `${sibling.color} (agotado)`
              }
              className={cn(
                "relative flex size-8 items-center justify-center rounded-full border border-transparent p-0.5 hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                !sibling.available && "opacity-60",
              )}
            >
              <span
                aria-hidden="true"
                className="size-full rounded-full border border-foreground/20"
                style={{ backgroundColor: sibling.hex ?? undefined }}
              />
              {!sibling.available && (
                <span
                  aria-hidden="true"
                  className="absolute h-px w-8 rotate-45 bg-foreground/60"
                />
              )}
              <span className="sr-only">
                Ver en {sibling.color}
                {!sibling.available && ", agotado"}
              </span>
            </Link>
          ))}
        </div>
      </fieldset>

      <div className="relative">
        {/* Fuera del fieldset: un botón dentro de <legend> formaría parte del nombre del grupo. */}
        {!isOneSize && (
          <div className="absolute -top-1.5 right-0">
            <SizeGuideDialog />
          </div>
        )}
        <fieldset
          ref={sizeGroupRef}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        >
          <legend className="mb-3 label-caps">
            Talla{size ? `: ${size}` : ""}
          </legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((option) => {
              const inputId = `${id}-size-${option.size}`;
              return (
                <div key={option.size}>
                  <input
                    id={inputId}
                    type="radio"
                    name={`${id}-size`}
                    value={option.size}
                    checked={size === option.size}
                    disabled={!option.available}
                    onChange={() => {
                      setSize(option.size);
                      setError(null);
                    }}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={inputId}
                    className={cn(
                      "flex h-11 min-w-14 cursor-pointer items-center justify-center border px-3 text-xs peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:border-foreground/50",
                      "peer-disabled:cursor-not-allowed peer-disabled:text-muted-foreground peer-disabled:line-through peer-disabled:hover:border-border",
                    )}
                  >
                    {option.size}
                    {!option.available && (
                      <span className="sr-only">, agotada</span>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
          {error && (
            <p
              id={errorId}
              role="alert"
              className="mt-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {!soldOut && colorSoldOut && (
            <p className="mt-2 text-sm text-muted-foreground">
              Este color está agotado. Prueba con otro color.
            </p>
          )}
          {variant &&
            variant.stock > 0 &&
            variant.stock <= LOW_STOCK_THRESHOLD && (
              <p className="mt-2 text-sm font-medium" role="status">
                ¡Solo{" "}
                {variant.stock === 1
                  ? "queda 1 unidad"
                  : `quedan ${variant.stock} unidades`}
                !
              </p>
            )}
        </fieldset>
      </div>

      <Button
        size="cta"
        className="h-12 w-full"
        onClick={add}
        disabled={soldOut || colorSoldOut}
      >
        {soldOut ? "Agotado" : "Añadir al carrito"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Envío gratis desde {formatPrice(FREE_SHIPPING_THRESHOLD)} · Pago seguro
        con Stripe · Precios con IVA incluido
      </p>
    </div>
  );
}
