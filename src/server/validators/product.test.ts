import { describe, expect, it } from "vitest";

import { fieldErrors } from "@/lib/validation";

import {
  parseProductForm,
  uploadedImagesSchema,
  variantMatrixSchema,
} from "./product";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = {
  name: "Abrigo de lana cruzado",
  slug: "",
  description: "Abrigo largo de lana y cachemir.",
  price: "4,899.00",
  categoryId: "cat_1",
};

describe("parseProductForm", () => {
  it("convierte el precio a centavos y deriva el slug del nombre", () => {
    const result = parseProductForm(form({ ...valid, active: "on" }));
    expect(result.success && result.data).toEqual({
      ...valid,
      slug: "abrigo-de-lana-cruzado",
      price: 489900,
      model: null,
      active: true,
    });
  });

  it("el modelo es opcional y se recorta", () => {
    const result = parseProductForm(
      form({ ...valid, model: "  Playera Boxy Heavyweight " }),
    );
    expect(result.success && result.data.model).toBe(
      "Playera Boxy Heavyweight",
    );
  });

  it("un checkbox sin marcar es active = false", () => {
    const result = parseProductForm(form(valid));
    expect(result.success && result.data.active).toBe(false);
  });

  it.each([
    ["price", "0", "mayor que 0"],
    ["price", "-10", "no válido"],
    ["price", "12.345", "no válido"],
    ["price", "1000000.01", "superar"],
    ["slug", "Abrigo Lana", "minúsculas"],
    ["slug", "abrigo--lana", "minúsculas"],
    ["name", "A", "al menos 2"],
    ["categoryId", "", "categoría"],
  ])("%s = %j → error «%s»", (field, value, message) => {
    const result = parseProductForm(form({ ...valid, [field]: value }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)[field]).toContain(message);
    }
  });
});

const matrix = {
  colors: [{ name: "Negro", hex: "#1C1C1C" }],
  sizes: ["S", "M"],
  cells: [
    { color: "Negro", size: "S", stock: 3, expected: 3 },
    { color: "Negro", size: "M", stock: 0, expected: null },
  ],
};

describe("variantMatrixSchema", () => {
  it("acepta una matriz válida", () => {
    expect(variantMatrixSchema.safeParse(matrix).success).toBe(true);
  });

  it.each([
    ["stock negativo", { cells: [{ ...matrix.cells[0], stock: -1 }] }],
    ["stock decimal", { cells: [{ ...matrix.cells[0], stock: 1.5 }] }],
    ["talla desconocida", { sizes: ["XXL"] }],
    ["Única combinada", { sizes: ["Única", "S"], cells: [] }],
    [
      "colores repetidos",
      {
        colors: [
          { name: "Negro", hex: "#000000" },
          { name: "negro", hex: "#111111" },
        ],
      },
    ],
    ["hex inválido", { colors: [{ name: "Negro", hex: "black" }] }],
    [
      "celda huérfana",
      { cells: [{ color: "Rojo", size: "S", stock: 1, expected: null }] },
    ],
    ["sin colores", { colors: [], cells: [] }],
  ])("rechaza %s", (_, patch) => {
    expect(variantMatrixSchema.safeParse({ ...matrix, ...patch }).success).toBe(
      false,
    );
  });
});

describe("uploadedImagesSchema", () => {
  const upload = {
    publicId: "atelier/products/p1/abc",
    version: 1795165369,
    signature: "a".repeat(40),
    format: "webp",
  };

  it("acepta una subida bien formada", () => {
    expect(uploadedImagesSchema.safeParse([upload]).success).toBe(true);
  });

  it.each([
    ["formato no permitido", { format: "svg" }],
    ["firma con caracteres raros", { signature: "zz" + "a".repeat(38) }],
    ["versión no entera", { version: 1.5 }],
  ])("rechaza %s", (_, patch) => {
    expect(
      uploadedImagesSchema.safeParse([{ ...upload, ...patch }]).success,
    ).toBe(false);
  });
});
