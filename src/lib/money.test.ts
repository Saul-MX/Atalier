import { describe, expect, it } from "vitest";

import {
  centsToInput,
  formatPrice,
  isCents,
  lineTotal,
  parsePriceToCents,
} from "./money";

describe("formatPrice", () => {
  it("formatea centavos como pesos mexicanos", () => {
    expect(formatPrice(129900)).toBe("$1,299.00");
    expect(formatPrice(0)).toBe("$0.00");
    expect(formatPrice(5)).toBe("$0.05");
  });

  it("rechaza importes que no son centavos enteros", () => {
    expect(() => formatPrice(12.5)).toThrow(RangeError);
    expect(() => formatPrice(-100)).toThrow(RangeError);
    expect(() => formatPrice(Number.NaN)).toThrow(RangeError);
  });
});

describe("parsePriceToCents", () => {
  it.each([
    ["1299", 129900],
    ["1,299.50", 129950],
    ["$1,299.5", 129950],
    ["0.05", 5],
    ["  89.90 ", 8990],
  ])("convierte %j a %d centavos", (input, expected) => {
    expect(parsePriceToCents(input)).toBe(expected);
  });

  it("evita errores de coma flotante (0.1 + 0.2)", () => {
    expect(parsePriceToCents("0.30")).toBe(30);
    expect(parsePriceToCents("19.99")).toBe(1999);
  });

  it.each(["", "abc", "-10", "1.999", "1.2.3", "1e3"])(
    "devuelve null para %j",
    (input) => {
      expect(parsePriceToCents(input)).toBeNull();
    },
  );
});

describe("lineTotal", () => {
  it("multiplica precio unitario por cantidad", () => {
    expect(lineTotal(129900, 3)).toBe(389700);
  });

  it("rechaza cantidades o precios inválidos", () => {
    expect(() => lineTotal(100, 1.5)).toThrow(RangeError);
    expect(() => lineTotal(100, -1)).toThrow(RangeError);
    expect(() => lineTotal(99.9, 1)).toThrow(RangeError);
  });
});

describe("isCents", () => {
  it("solo acepta enteros seguros no negativos", () => {
    expect(isCents(0)).toBe(true);
    expect(isCents(150000)).toBe(true);
    expect(isCents(1.5)).toBe(false);
    expect(isCents(-1)).toBe(false);
    expect(isCents("100")).toBe(false);
  });
});

describe("centsToInput", () => {
  it.each([
    [0, "0.00"],
    [5, "0.05"],
    [129950, "1299.50"],
    [489900, "4899.00"],
  ])("%d → %j y vuelta", (cents, text) => {
    expect(centsToInput(cents)).toBe(text);
    expect(parsePriceToCents(text)).toBe(cents);
  });
});
