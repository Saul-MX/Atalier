import { describe, expect, it } from "vitest";

import {
  type ExistingVariant,
  matrixFromVariants,
  planVariantChanges,
} from "./variant-matrix";

const NEGRO = { name: "Negro", hex: "#1C1C1C" };
const CRUDO = { name: "Crudo", hex: "#EDE6D6" };

function variant(
  id: string,
  color: string,
  size: string,
  stock: number,
  extra: Partial<ExistingVariant> = {},
): ExistingVariant {
  const colorHex = color === "Negro" ? NEGRO.hex : CRUDO.hex;
  return { id, color, colorHex, size, stock, hasOrders: false, ...extra };
}

const existing = [
  variant("v1", "Negro", "S", 5),
  variant("v2", "Negro", "M", 0),
];

describe("planVariantChanges", () => {
  it("sin cambios no genera operaciones", () => {
    const plan = planVariantChanges(existing, matrixFromVariants(existing));
    expect(plan).toEqual({
      create: [],
      update: [],
      remove: [],
      blocked: [],
      conflicts: [],
    });
  });

  it("crea las combinaciones nuevas con su stock (0 si no hay celda)", () => {
    const plan = planVariantChanges(existing, {
      colors: [NEGRO, CRUDO],
      sizes: ["S", "M"],
      cells: [
        { color: "Negro", size: "S", stock: 5, expected: 5 },
        { color: "Negro", size: "M", stock: 0, expected: 0 },
        { color: "Crudo", size: "S", stock: 7, expected: null },
      ],
    });
    expect(plan.create).toEqual([
      { color: "Crudo", colorHex: CRUDO.hex, size: "S", stock: 7 },
      { color: "Crudo", colorHex: CRUDO.hex, size: "M", stock: 0 },
    ]);
    expect(plan.update).toEqual([]);
  });

  it("actualiza el stock cambiado con escritura condicional", () => {
    const plan = planVariantChanges(existing, {
      colors: [NEGRO],
      sizes: ["S", "M"],
      cells: [
        { color: "Negro", size: "S", stock: 8, expected: 5 },
        { color: "Negro", size: "M", stock: 0, expected: 0 },
      ],
    });
    expect(plan.update).toEqual([
      { id: "v1", stock: { value: 8, expected: 5 } },
    ]);
  });

  it("detecta conflicto si una venta cambió el stock mientras se editaba", () => {
    // El admin vio 5 y pone 8, pero la BD ya tiene 4 (se reservó 1).
    const sold = [variant("v1", "Negro", "S", 4), existing[1]!];
    const plan = planVariantChanges(sold, {
      colors: [NEGRO],
      sizes: ["S", "M"],
      cells: [
        { color: "Negro", size: "S", stock: 8, expected: 5 },
        { color: "Negro", size: "M", stock: 0, expected: 0 },
      ],
    });
    expect(plan.conflicts).toEqual([{ color: "Negro", size: "S", current: 4 }]);
    expect(plan.update).toEqual([]);
  });

  it("no pisa una venta en celdas que el admin no tocó", () => {
    const sold = [variant("v1", "Negro", "S", 4), existing[1]!];
    const plan = planVariantChanges(sold, matrixFromVariants(existing));
    expect(plan.update).toEqual([]);
    expect(plan.conflicts).toEqual([]);
  });

  it("actualiza el hex de todas las variantes del color", () => {
    const plan = planVariantChanges(existing, {
      ...matrixFromVariants(existing),
      colors: [{ name: "Negro", hex: "#000000" }],
    });
    expect(plan.update).toEqual([
      { id: "v1", colorHex: "#000000" },
      { id: "v2", colorHex: "#000000" },
    ]);
  });

  it("borra las combinaciones quitadas y bloquea las que tienen pedidos", () => {
    const withOrders = [
      variant("v1", "Negro", "S", 5),
      variant("v2", "Negro", "M", 0, { hasOrders: true }),
      variant("v3", "Crudo", "S", 2),
    ];
    const plan = planVariantChanges(withOrders, {
      colors: [NEGRO],
      sizes: ["S"],
      cells: [{ color: "Negro", size: "S", stock: 5, expected: 5 }],
    });
    expect(plan.remove).toEqual(["v3"]);
    expect(plan.blocked).toEqual([{ color: "Negro", size: "M" }]);
  });
});

describe("matrixFromVariants", () => {
  it("agrupa colores en orden y ordena las tallas canónicamente", () => {
    const matrix = matrixFromVariants([
      variant("a", "Crudo", "L", 1),
      variant("b", "Negro", "XS", 2),
      variant("c", "Crudo", "S", 3),
    ]);
    expect(matrix.colors.map((c) => c.name)).toEqual(["Crudo", "Negro"]);
    expect(matrix.sizes).toEqual(["XS", "S", "L"]);
    expect(matrix.cells[0]).toEqual({
      color: "Crudo",
      size: "L",
      stock: 1,
      expected: 1,
    });
  });
});
