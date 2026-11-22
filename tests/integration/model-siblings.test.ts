import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Un producto por color agrupado por `model`: la ficha recibe los demás
 * colores del modelo como enlaces a sus productos.
 */

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

const { prisma } = await import("@/lib/prisma");
const { getProductBySlug } = await import("@/server/catalog/queries");

async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "OrderItem", "Order", "ProductVariant", "ProductImage", "Product", "Category", "StripeEvent" CASCADE',
  );
}

let categoryId = "";
async function createPlayera(
  slug: string,
  color: string,
  hex: string,
  opts: { model?: string | null; active?: boolean; stock?: number } = {},
) {
  return prisma.product.create({
    data: {
      name: `Playera Boxy - ${color}`,
      slug,
      description: "Producto de prueba de integración.",
      basePrice: 89_000,
      model: opts.model === undefined ? "Playera Boxy" : opts.model,
      active: opts.active ?? true,
      categoryId,
      variants: {
        create: [{ size: "M", color, colorHex: hex, stock: opts.stock ?? 5 }],
      },
    },
  });
}

describe("productos del mismo modelo", () => {
  beforeEach(async () => {
    await resetDb();
    ({ id: categoryId } = await prisma.category.create({
      data: { name: "Hombre", slug: "hombre" },
    }));
  });
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it("enlaza los demás colores del modelo, en orden de alta", async () => {
    await createPlayera("playera-negra", "Washed Black", "#222222");
    await createPlayera("playera-blanca", "Chalk White", "#f4f1e8", {
      stock: 0,
    });

    const negra = await getProductBySlug("playera-negra");
    expect(negra?.siblings).toEqual([
      {
        slug: "playera-blanca",
        name: "Playera Boxy - Chalk White",
        color: "Chalk White",
        hex: "#f4f1e8",
        available: false,
      },
    ]);

    const blanca = await getProductBySlug("playera-blanca");
    expect(blanca?.siblings.map((s) => s.slug)).toEqual(["playera-negra"]);
  });

  it("omite borradores, otros modelos y productos sin modelo", async () => {
    await createPlayera("playera-negra", "Washed Black", "#222222");
    await createPlayera("borrador", "Arena", "#c6b79e", { active: false });
    await createPlayera("otro", "Oliva", "#6b6b3a", { model: "Otro modelo" });
    await createPlayera("suelta", "Gris", "#888888", { model: null });

    expect((await getProductBySlug("playera-negra"))?.siblings).toEqual([]);
    expect((await getProductBySlug("suelta"))?.siblings).toEqual([]);
  });
});
