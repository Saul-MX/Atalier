import { describe, expect, it } from "vitest";

import { SLUG_MAX, SLUG_PATTERN, slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Abrigo de lana cruzado", "abrigo-de-lana-cruzado"],
    ["Pañuelo de SEDA · estampado", "panuelo-de-seda-estampado"],
    ["  --Jersey   cachemir!! ", "jersey-cachemir"],
    ["Camisa 100% lino", "camisa-100-lino"],
    ["¿?¡!", ""],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("produce slugs válidos y sin guion final al recortar", () => {
    const slug = slugify(`${"a".repeat(SLUG_MAX - 1)} bcd`);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(slug).toMatch(SLUG_PATTERN);
  });
});
