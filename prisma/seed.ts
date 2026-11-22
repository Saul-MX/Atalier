/**
 * Seed de ATELIER: categorías, catálogo con variantes e imágenes provisionales
 * y el usuario administrador. Idempotente: se puede ejecutar varias veces
 * (upsert por slug / [productId, size, color]); restablece el stock de demo.
 *
 * Uso: pnpm db:seed   (requiere DIRECT_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD)
 */
import { z } from "zod";

import { auth, prisma } from "../auth.config";
import { ADMIN_ROLE } from "../src/lib/auth/options";

import {
  CATEGORIES,
  PRODUCTS,
  seedImagePath,
  seedImagePublicId,
  skuFor,
  stockFor,
} from "./seed-data";

const DAY_MS = 24 * 60 * 60 * 1000;

const seedEnv = z
  .object({
    SEED_ADMIN_EMAIL: z.email().transform((email) => email.toLowerCase()),
    SEED_ADMIN_PASSWORD: z.string().min(8),
  })
  .safeParse(process.env);

async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const category of CATEGORIES) {
    const { id } = await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name, position: category.position },
    });
    ids.set(category.slug, id);
  }
  return ids;
}

async function seedProducts(categoryIds: Map<string, string>) {
  let variantCount = 0;
  const now = Date.now();

  for (const [index, product] of PRODUCTS.entries()) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId)
      throw new Error(`Categoría desconocida: ${product.category}`);

    // Fechas escalonadas para que "Novedades" tenga un orden estable.
    const createdAt = new Date(now - index * DAY_MS);

    await prisma.$transaction(
      async (tx) => {
        const fields = {
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          active: true,
          categoryId,
          createdAt,
        };
        const { id: productId } = await tx.product.upsert({
          where: { slug: product.slug },
          create: { slug: product.slug, ...fields },
          update: fields,
        });

        // Las imágenes provisionales (publicId "seed/…") solo se usan mientras
        // el producto no tenga fotos reales subidas desde el admin.
        await tx.productImage.deleteMany({
          where: { productId, publicId: { startsWith: "seed/" } },
        });
        const realImages = await tx.productImage.count({
          where: { productId },
        });
        if (realImages === 0)
          await tx.productImage.createMany({
            data: product.colors.map((_, position) => ({
              productId,
              url: seedImagePath(product.slug, position),
              publicId: seedImagePublicId(product.slug, position),
              isMain: position === 0,
              position,
            })),
          });

        for (const color of product.colors) {
          for (const size of product.sizes) {
            const sku = skuFor(product, color, size);
            const stock = stockFor(product, sku);
            await tx.productVariant.upsert({
              where: {
                productId_size_color: { productId, size, color: color.name },
              },
              create: {
                productId,
                size,
                color: color.name,
                colorHex: color.hex,
                sku,
                stock,
              },
              update: { colorHex: color.hex, sku, stock },
            });
            variantCount++;
          }
        }
      },
      { timeout: 30_000 },
    );
  }

  return variantCount;
}

/**
 * Retira lo que ya no está en el catálogo de demo (p. ej. tras cambiar las
 * categorías). Los productos con pedidos no se pueden borrar (los pedidos
 * conservan sus líneas), así que se desactivan; las categorías se borran
 * cuando se quedan vacías. Los productos creados desde el admin también se
 * retiran: el seed define el catálogo de la demo.
 */
async function retireStaleCatalog() {
  const seedSlugs = PRODUCTS.map((product) => product.slug);
  const stale = { slug: { notIn: seedSlugs } };

  // Sus SVG provisionales ya no existen en public/seed: sin imagen, el admin
  // muestra el marcador en lugar de una imagen rota.
  await prisma.productImage.deleteMany({
    where: { publicId: { startsWith: "seed/" }, product: stale },
  });
  const { count: deleted } = await prisma.product.deleteMany({
    where: { ...stale, variants: { none: { orderItems: { some: {} } } } },
  });
  const { count: deactivated } = await prisma.product.updateMany({
    where: { ...stale, active: true },
    data: { active: false },
  });
  const { count: categories } = await prisma.category.deleteMany({
    where: {
      slug: { notIn: CATEGORIES.map((category) => category.slug) },
      products: { none: {} },
    },
  });

  return { deleted, deactivated, categories };
}

async function seedAdmin(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });

  let userId = existing?.id;
  if (!userId) {
    // API pública de Better Auth: hashea la contraseña y crea user + account.
    const result = await auth.api.signUpEmail({
      body: { email, password, name: "Admin ATELIER" },
    });
    userId = result.user.id;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: ADMIN_ROLE, emailVerified: true },
  });
  // signUpEmail inicia sesión automáticamente; el seed no necesita esa sesión.
  await prisma.session.deleteMany({ where: { userId } });

  return existing ? "ya existía (rol admin asegurado)" : "creado";
}

async function main() {
  if (!seedEnv.success) {
    const keys = seedEnv.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Variables del seed inválidas o ausentes: ${keys.join(", ")}. Revisa tu .env.`,
    );
  }

  const categoryIds = await seedCategories();
  const variantCount = await seedProducts(categoryIds);
  const retired = await retireStaleCatalog();
  const adminStatus = await seedAdmin(
    seedEnv.data.SEED_ADMIN_EMAIL,
    seedEnv.data.SEED_ADMIN_PASSWORD,
  );

  console.log(
    `✓ ${categoryIds.size} categorías, ${PRODUCTS.length} productos, ${variantCount} variantes`,
  );
  console.log(
    `✓ Catálogo anterior: ${retired.deleted} productos borrados, ${retired.deactivated} desactivados (tienen pedidos), ${retired.categories} categorías borradas`,
  );
  console.log(`✓ Admin ${seedEnv.data.SEED_ADMIN_EMAIL}: ${adminStatus}`);
}

main()
  .catch((error: unknown) => {
    console.error(
      "✗ Seed fallido:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
