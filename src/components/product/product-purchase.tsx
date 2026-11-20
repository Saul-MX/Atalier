"use client";

import { CheckIcon, ShoppingBagIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

import { SizeGuideDialog } from "./size-guide-dialog";

export type PurchaseProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  variants: VariantOption[];
};

/** Selector de variantes dependiente (color → tallas con stock) + añadir al carrito. */
export function ProductPurchase({ product }: { product: PurchaseProduct }) {
  const id = useId();
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.open);
  const sizeGroupRef = useRef<HTMLFieldSetElement>(null);

  const colors = colorOptions(product.variants);
  const [color, setColor] = useState(
    () => defaultColor(product.variants) ?? "",
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
      image: product.image,
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
        <legend className="mb-3 text-sm">
          Color: <span className="font-medium">{color}</span>
        </legend>
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
                    "relative flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-transparent p-0.5 peer-checked:border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
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
                      className="absolute h-0.5 w-9 rotate-45 bg-foreground/60"
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
          <legend className="mb-3 text-sm">
            Talla{size ? ": " : ""}
            {size && <span className="font-medium">{size}</span>}
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
                      "flex h-11 min-w-12 cursor-pointer items-center justify-center rounded-md border px-3 text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:border-foreground/50",
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
        size="lg"
        className="h-12 w-full text-base"
        onClick={add}
        disabled={soldOut || colorSoldOut}
      >
        {soldOut ? (
          "Agotado"
        ) : (
          <>
            <ShoppingBagIcon aria-hidden="true" />
            Añadir al carrito
          </>
        )}
      </Button>

      <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <CheckIcon className="size-4" aria-hidden="true" />
          Envío gratis desde {formatPrice(FREE_SHIPPING_THRESHOLD)}
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon className="size-4" aria-hidden="true" />
          Pago seguro con Stripe
        </li>
      </ul>
    </div>
  );
}
