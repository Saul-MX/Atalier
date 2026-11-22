import { describe, expect, it } from "vitest";

import { imagesForColor } from "./product-images";

const img = (id: string, color: string | null) => ({ id, color });
const ids = (images: { id: string }[]) => images.map((image) => image.id);

describe("imagesForColor", () => {
  const images = [
    img("negra-1", "Negro"),
    img("general", null),
    img("blanca-1", "Blanco"),
    img("negra-2", "Negro"),
  ];

  it("muestra primero las fotos del color y después las generales", () => {
    expect(ids(imagesForColor(images, "Negro"))).toEqual([
      "negra-1",
      "negra-2",
      "general",
    ]);
    expect(ids(imagesForColor(images, "Blanco"))).toEqual([
      "blanca-1",
      "general",
    ]);
  });

  it("sin fotos propias del color, muestra solo las generales", () => {
    expect(ids(imagesForColor(images, "Arena"))).toEqual(["general"]);
    expect(ids(imagesForColor(images, null))).toEqual(["general"]);
  });

  it("sin fotos del color ni generales, muestra todas", () => {
    const tagged = [img("negra", "Negro"), img("blanca", "Blanco")];
    expect(ids(imagesForColor(tagged, "Arena"))).toEqual(["negra", "blanca"]);
  });

  it("sin colores asignados, no cambia nada", () => {
    const plain = [img("a", null), img("b", null)];
    expect(ids(imagesForColor(plain, "Negro"))).toEqual(["a", "b"]);
  });

  it("sin fotos, devuelve una lista vacía", () => {
    expect(imagesForColor([], "Negro")).toEqual([]);
  });
});
