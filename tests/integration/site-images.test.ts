import { createHash } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Imágenes de la portada (hero y categorías) contra Postgres real. Las
 * subidas se firman como lo haría Cloudinary; no hay llamadas a su API.
 */

process.env.CLOUDINARY_CLOUD_NAME = "atelier-test";
process.env.CLOUDINARY_API_KEY = "123456789012345";
process.env.CLOUDINARY_API_SECRET = "cloudinary-integration-secret";

const destroyed = vi.hoisted(() => [] as string[]);
vi.mock(import("@/lib/cloudinary"), async (importOriginal) => ({
  ...(await importOriginal()),
  destroyImages: vi.fn(async (ids: string[]) => {
    destroyed.push(...ids);
  }),
}));
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

const { prisma } = await import("@/lib/prisma");
const { removeSiteImage, setSiteImage } =
  await import("@/server/services/site-content");
const { getCategoryHighlights, getHeroImage } =
  await import("@/server/catalog/queries");

function signed(publicId: string) {
  const version = 1_700_000_000;
  const signature = createHash("sha1")
    .update(
      `public_id=${publicId}&version=${version}${process.env.CLOUDINARY_API_SECRET}`,
    )
    .digest("hex");
  return { publicId, version, signature, format: "jpg" as const };
}

async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "OrderItem", "Order", "ProductVariant", "ProductImage", "Product", "Category", "StripeEvent", "SiteImage" CASCADE',
  );
  destroyed.length = 0;
}

/** Categoría con un producto activo cuya foto es el respaldo de la tarjeta. */
async function createCategory() {
  return prisma.category.create({
    data: {
      name: "Hombre",
      slug: "hombre",
      products: {
        create: {
          name: "Playera",
          slug: "playera",
          description: "Producto de prueba de integración.",
          basePrice: 89_000,
          images: {
            create: { url: "https://img/playera.jpg", publicId: "p/playera" },
          },
          variants: { create: { size: "M", color: "Negro", stock: 3 } },
        },
      },
    },
  });
}

describe("imágenes de la portada", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it("guarda la imagen del hero y al cambiarla borra la anterior", async () => {
    expect(await getHeroImage()).toBeNull();

    const first = signed("atelier/site/hero/uno");
    expect(await setSiteImage({ kind: "hero" }, first)).toEqual({ ok: true });
    expect(await getHeroImage()).toBe(
      "https://res.cloudinary.com/atelier-test/image/upload/v1700000000/atelier/site/hero/uno.jpg",
    );

    await setSiteImage({ kind: "hero" }, signed("atelier/site/hero/dos"));
    expect(await getHeroImage()).toMatch(/\/hero\/dos\.jpg$/);
    expect(destroyed).toEqual(["atelier/site/hero/uno"]);

    expect(await removeSiteImage({ kind: "hero" })).toEqual({ ok: true });
    expect(await getHeroImage()).toBeNull();
    expect(destroyed).toEqual([
      "atelier/site/hero/uno",
      "atelier/site/hero/dos",
    ]);
  });

  it("rechaza subidas sin firma válida o de otra carpeta", async () => {
    const category = await createCategory();
    const forged = {
      ...signed("atelier/site/hero/x"),
      signature: "0".repeat(40),
    };

    expect(await setSiteImage({ kind: "hero" }, forged)).toEqual({
      ok: false,
      reason: "invalid-upload",
    });
    // Firmada, pero de la carpeta de un producto: no vale para el hero.
    expect(
      await setSiteImage({ kind: "hero" }, signed("atelier/products/p1/foto")),
    ).toEqual({ ok: false, reason: "invalid-upload" });
    // Ni la de otra categoría.
    expect(
      await setSiteImage(
        { kind: "category", categoryId: category.id },
        signed("atelier/site/categories/otra/foto"),
      ),
    ).toEqual({ ok: false, reason: "invalid-upload" });
    expect(await getHeroImage()).toBeNull();
  });

  it("la tarjeta de categoría usa su imagen y, sin ella, la de un producto", async () => {
    const category = await createCategory();
    const card = async () => (await getCategoryHighlights())[0]?.image;

    expect(await card()).toBe("https://img/playera.jpg");

    const upload = signed(`atelier/site/categories/${category.id}/portada`);
    expect(
      await setSiteImage({ kind: "category", categoryId: category.id }, upload),
    ).toEqual({ ok: true });
    expect(await card()).toMatch(/\/categories\/.+\/portada\.jpg$/);

    await removeSiteImage({ kind: "category", categoryId: category.id });
    expect(await card()).toBe("https://img/playera.jpg");
    expect(destroyed).toEqual([upload.publicId]);
  });

  it("si la categoría ya no existe, no deja el archivo huérfano", async () => {
    const upload = signed("atelier/site/categories/borrada/foto");
    expect(
      await setSiteImage({ kind: "category", categoryId: "borrada" }, upload),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(destroyed).toEqual([upload.publicId]);
  });
});
