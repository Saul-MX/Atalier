// @vitest-environment node
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CATEGORIES,
  PRODUCTS,
  seedImagePath,
  skuFor,
  stockFor,
} from "../prisma/seed-data";
import { isCents } from "../src/lib/money";

const variants = PRODUCTS.flatMap((product) =>
  product.colors.flatMap((color) =>
    product.sizes.map((size) => {
      const sku = skuFor(product, color, size);
      return { product, color, size, sku, stock: stockFor(product, sku) };
    }),
  ),
);

describe("datos del seed", () => {
  it("tiene al menos 12 productos en categorías existentes", () => {
    const categorySlugs = new Set(CATEGORIES.map((c) => c.slug));
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(12);
    for (const product of PRODUCTS) {
      expect(categorySlugs.has(product.category)).toBe(true);
    }
  });

  it("usa slugs y SKUs únicos", () => {
    const slugs = PRODUCTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const skus = variants.map((v) => v.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("guarda precios como centavos enteros", () => {
    for (const product of PRODUCTS) {
      expect(isCents(product.basePrice)).toBe(true);
      expect(product.basePrice).toBeGreaterThan(0);
    }
  });

  it("genera stock determinista con casos agotado y stock bajo", () => {
    for (const v of variants) {
      expect(Number.isInteger(v.stock)).toBe(true);
      expect(v.stock).toBeGreaterThanOrEqual(0);
      expect(stockFor(v.product, v.sku)).toBe(v.stock);
    }
    expect(variants.some((v) => v.stock === 0)).toBe(true);
    expect(variants.some((v) => v.stock >= 1 && v.stock <= 3)).toBe(true);
    const soldOut = PRODUCTS.filter((p) => p.soldOut);
    expect(soldOut.length).toBeGreaterThan(0);
    for (const v of variants.filter((v) => v.product.soldOut)) {
      expect(v.stock).toBe(0);
    }
  });

  it("tiene una imagen provisional por color de cada producto", () => {
    for (const product of PRODUCTS) {
      product.colors.forEach((_, index) => {
        const file = join(
          process.cwd(),
          "public",
          seedImagePath(product.slug, index),
        );
        expect(existsSync(file), file).toBe(true);
      });
    }
  });
});
