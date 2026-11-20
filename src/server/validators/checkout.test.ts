import { describe, expect, it } from "vitest";

import { orderTotals } from "@/lib/checkout/totals";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/catalog/variants";
import { FLAT_SHIPPING_COST } from "@/lib/shipping";

import { checkoutRequestSchema, normalizeLines } from "./checkout";

describe("checkoutRequestSchema", () => {
  it("descarta los precios que mande el cliente", () => {
    const parsed = checkoutRequestSchema.parse({
      items: [{ variantId: "v1", quantity: 2, unitPrice: 1 }],
    });
    expect(parsed.items[0]).toEqual({ variantId: "v1", quantity: 2 });
  });

  it.each([
    ["carrito vacío", { items: [] }],
    ["cantidad 0", { items: [{ variantId: "v1", quantity: 0 }] }],
    ["cantidad decimal", { items: [{ variantId: "v1", quantity: 1.5 }] }],
    ["cantidad negativa", { items: [{ variantId: "v1", quantity: -1 }] }],
    [
      "más del tope por línea",
      { items: [{ variantId: "v1", quantity: MAX_QUANTITY_PER_ITEM + 1 }] },
    ],
    ["sin variantId", { items: [{ quantity: 1 }] }],
    ["cuerpo sin items", {}],
  ])("rechaza %s", (_, body) => {
    expect(checkoutRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe("normalizeLines", () => {
  it("une variantes repetidas y ordena por id", () => {
    expect(
      normalizeLines([
        { variantId: "b", quantity: 1 },
        { variantId: "a", quantity: 2 },
        { variantId: "b", quantity: 3 },
      ]),
    ).toEqual([
      { variantId: "a", quantity: 2 },
      { variantId: "b", quantity: 4 },
    ]);
  });

  it("detecta el tope superado al unir líneas", () => {
    expect(
      normalizeLines([
        { variantId: "a", quantity: MAX_QUANTITY_PER_ITEM },
        { variantId: "a", quantity: 1 },
      ]),
    ).toEqual({ error: "too-many", variantId: "a" });
  });
});

describe("orderTotals", () => {
  it("suma líneas y cobra envío bajo el umbral", () => {
    expect(
      orderTotals([
        { unitPrice: 59_900, quantity: 2 },
        { unitPrice: 10_000, quantity: 1 },
      ]),
    ).toEqual({
      subtotal: 129_800,
      shippingCost: FLAT_SHIPPING_COST,
      total: 129_800 + FLAT_SHIPPING_COST,
    });
  });

  it("envío gratis desde $1,500", () => {
    expect(orderTotals([{ unitPrice: 150_000, quantity: 1 }])).toEqual({
      subtotal: 150_000,
      shippingCost: 0,
      total: 150_000,
    });
  });
});
