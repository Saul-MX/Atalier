import { describe, expect, it } from "vitest";

import {
  FLAT_SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
  freeShippingProgress,
  shippingCostFor,
} from "./shipping";

describe("envío", () => {
  it("cobra tarifa plana por debajo del umbral y gratis desde él", () => {
    expect(shippingCostFor(0)).toBe(0);
    expect(shippingCostFor(FREE_SHIPPING_THRESHOLD - 1)).toBe(
      FLAT_SHIPPING_COST,
    );
    expect(shippingCostFor(FREE_SHIPPING_THRESHOLD)).toBe(0);
  });

  it("calcula el progreso hacia el envío gratis", () => {
    expect(freeShippingProgress(0)).toEqual({
      qualifies: false,
      remaining: FREE_SHIPPING_THRESHOLD,
      percent: 0,
    });
    expect(freeShippingProgress(FREE_SHIPPING_THRESHOLD / 2)).toMatchObject({
      remaining: FREE_SHIPPING_THRESHOLD / 2,
      percent: 50,
    });
    expect(freeShippingProgress(FREE_SHIPPING_THRESHOLD * 3)).toEqual({
      qualifies: true,
      remaining: 0,
      percent: 100,
    });
  });
});
