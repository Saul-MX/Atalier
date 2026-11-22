import { afterAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Fotos por color contra Postgres real: asignación desde el admin, limpieza
 * al quitar un color y foto de la línea de pago según el color comprado.
 */

const { prisma } = await import("@/lib/prisma");
const { saveVariants, setImageColor } =
  await import("@/server/services/admin-products");
const { reserveOrder } = await import("@/server/services/orders");

async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "OrderItem", "Order", "ProductVariant", "ProductImage", "Product", "Category", "StripeEvent" CASCADE',
  );
}

/** Playera en Negro y Blanco (talla M), con una foto por color y una general. */
async function createProduct() {
  const product = await prisma.product.create({
    data: {
      name: "Playera boxy",
      slug: "playera-boxy",
      description: "Producto de prueba de integración.",
      basePrice: 89_000,
      category: { create: { name: "Hombre", slug: "hombre" } },
      variants: {
        create: [
          { size: "M", color: "Negro", colorHex: "#111111", stock: 5 },
          { size: "M", color: "Blanco", colorHex: "#f5f5f0", stock: 5 },
        ],
      },
      images: {
        create: [
          { url: "https://img/negra.jpg", publicId: "p/negra", position: 0 },
          { url: "https://img/blanca.jpg", publicId: "p/blanca", position: 1 },
          { url: "https://img/detalle.jpg", publicId: "p/det", position: 2 },
        ],
      },
    },
    select: {
      id: true,
      images: { orderBy: { position: "asc" }, select: { id: true } },
      variants: { select: { id: true, color: true } },
    },
  });
  const [negra, blanca] = product.images.map((image) => image.id);
  const variant = (color: string) =>
    product.variants.find((v) => v.color === color)!.id;
  return { id: product.id, negra: negra!, blanca: blanca!, variant };
}

const colorOf = async (imageId: string) =>
  (await prisma.productImage.findUniqueOrThrow({ where: { id: imageId } }))
    .color;

describe("fotos por color", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it("asigna una foto a un color de sus variantes y la devuelve a todos", async () => {
    const product = await createProduct();

    expect(await setImageColor(product.blanca, "Blanco")).toEqual({
      ok: true,
      slug: "playera-boxy",
    });
    expect(await colorOf(product.blanca)).toBe("Blanco");

    expect(await setImageColor(product.blanca, null)).toMatchObject({
      ok: true,
    });
    expect(await colorOf(product.blanca)).toBeNull();
  });

  it("rechaza un color que el producto no tiene", async () => {
    const product = await createProduct();

    expect(await setImageColor(product.negra, "Rojo")).toEqual({
      ok: false,
      reason: "unknown-color",
    });
    expect(await colorOf(product.negra)).toBeNull();
    expect(await setImageColor("no-existe", null)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("al quitar un color, sus fotos pasan a valer para todos", async () => {
    const product = await createProduct();
    await setImageColor(product.negra, "Negro");
    await setImageColor(product.blanca, "Blanco");

    const result = await saveVariants(product.id, {
      colors: [{ name: "Negro", hex: "#111111" }],
      sizes: ["M"],
      cells: [{ color: "Negro", size: "M", stock: 5, expected: 5 }],
    });

    expect(result).toMatchObject({ ok: true });
    expect(await colorOf(product.negra)).toBe("Negro");
    expect(await colorOf(product.blanca)).toBeNull();
  });

  it("la línea de pago usa la foto del color comprado", async () => {
    const product = await createProduct();
    await setImageColor(product.negra, "Negro");
    await setImageColor(product.blanca, "Blanco");

    const priced = await reserveOrder({
      lines: [
        { variantId: product.variant("Blanco"), quantity: 1 },
        { variantId: product.variant("Negro"), quantity: 1 },
      ],
      userId: null,
      email: "comprador@example.com",
    });

    expect(priced.ok).toBe(true);
    if (!priced.ok) return;
    expect(priced.lines.map((line) => [line.color, line.image])).toEqual([
      ["Blanco", "https://img/blanca.jpg"],
      ["Negro", "https://img/negra.jpg"],
    ]);
  });
});
