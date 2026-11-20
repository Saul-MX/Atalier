import { describe, expect, it } from "vitest";

import {
  colorOptions,
  defaultColor,
  findVariant,
  maxQuantityFor,
  sizeOptionsFor,
  totalStock,
  type VariantOption,
} from "./variants";

const v = (
  id: string,
  color: string,
  size: string,
  stock: number,
): VariantOption => ({ id, color, size, stock, colorHex: null });

const variants = [
  v("1", "Negro", "L", 0),
  v("2", "Negro", "XS", 3),
  v("3", "Negro", "M", 0),
  v("4", "Camel", "S", 0),
  v("5", "Camel", "M", 0),
];

describe("selector de variantes", () => {
  it("lista colores en orden y marca los agotados", () => {
    expect(colorOptions(variants)).toEqual([
      { name: "Negro", hex: null, available: true },
      { name: "Camel", hex: null, available: false },
    ]);
  });

  it("solo habilita las tallas con stock del color elegido, en orden canónico", () => {
    expect(sizeOptionsFor(variants, "Negro")).toEqual([
      { size: "XS", variantId: "2", stock: 3, available: true },
      { size: "M", variantId: "3", stock: 0, available: false },
      { size: "L", variantId: "1", stock: 0, available: false },
    ]);
    expect(sizeOptionsFor(variants, "Camel").every((s) => !s.available)).toBe(
      true,
    );
  });

  it("elige como color inicial el primero con stock", () => {
    expect(
      defaultColor([v("a", "Camel", "M", 0), v("b", "Negro", "M", 2)]),
    ).toBe("Negro");
    expect(defaultColor([v("a", "Camel", "M", 0)])).toBe("Camel");
    expect(defaultColor([])).toBeUndefined();
  });

  it("encuentra la variante exacta por color y talla", () => {
    expect(findVariant(variants, "Negro", "XS")?.id).toBe("2");
    expect(findVariant(variants, "Camel", "XL")).toBeUndefined();
  });

  it("calcula stock total y cantidad máxima por artículo", () => {
    expect(totalStock(variants)).toBe(3);
    expect(maxQuantityFor(3)).toBe(3);
    expect(maxQuantityFor(50)).toBe(10);
    expect(maxQuantityFor(-1)).toBe(0);
  });
});
