import { compareSizes } from "./sizes";

/**
 * Lógica del selector de variantes dependiente (PDP): al elegir un color,
 * solo se habilitan las tallas de ese color con stock.
 */

export type VariantOption = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  stock: number;
};

export type ColorOption = {
  name: string;
  hex: string | null;
  available: boolean;
};

export type SizeOption = {
  size: string;
  variantId: string;
  stock: number;
  available: boolean;
};

export const LOW_STOCK_THRESHOLD = 3;
/** Máximo de unidades por variante en un mismo carrito. */
export const MAX_QUANTITY_PER_ITEM = 10;

/** Colores en orden de aparición; `available` si alguna talla tiene stock. */
export function colorOptions(variants: VariantOption[]): ColorOption[] {
  const byName = new Map<string, ColorOption>();
  for (const v of variants) {
    const current = byName.get(v.color);
    if (current) {
      current.available ||= v.stock > 0;
    } else {
      byName.set(v.color, {
        name: v.color,
        hex: v.colorHex,
        available: v.stock > 0,
      });
    }
  }
  return [...byName.values()];
}

export function sizeOptionsFor(
  variants: VariantOption[],
  color: string,
): SizeOption[] {
  return variants
    .filter((v) => v.color === color)
    .map((v) => ({
      size: v.size,
      variantId: v.id,
      stock: v.stock,
      available: v.stock > 0,
    }))
    .sort((a, b) => compareSizes(a.size, b.size));
}

export function findVariant(
  variants: VariantOption[],
  color: string,
  size: string,
): VariantOption | undefined {
  return variants.find((v) => v.color === color && v.size === size);
}

/** Color inicial: el primero con stock (o el primero si todo está agotado). */
export function defaultColor(variants: VariantOption[]): string | undefined {
  const options = colorOptions(variants);
  return (options.find((o) => o.available) ?? options[0])?.name;
}

/**
 * Pone primero las variantes de `color` (el de la foto principal), sin cambiar
 * el orden del resto. Así su muestra va primero y `defaultColor` lo elige si
 * tiene stock: la ficha abre en el color que se ve en la foto.
 */
export function withLeadColor<T extends { color: string }>(
  variants: T[],
  color: string | null | undefined,
): T[] {
  if (!color || !variants.some((v) => v.color === color)) return variants;
  return [
    ...variants.filter((v) => v.color === color),
    ...variants.filter((v) => v.color !== color),
  ];
}

export function totalStock(variants: { stock: number }[]): number {
  return variants.reduce((sum, v) => sum + v.stock, 0);
}

/** Unidades que se pueden añadir de una variante (límite por stock y por pedido). */
export function maxQuantityFor(stock: number): number {
  return Math.max(0, Math.min(stock, MAX_QUANTITY_PER_ITEM));
}
