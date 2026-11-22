import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { MAX_PRODUCT_IMAGES } from "@/lib/catalog/product-images";
import { compareSizes } from "@/lib/catalog/sizes";
import {
  type ExistingVariant,
  planVariantChanges,
  type VariantKey,
} from "@/lib/catalog/variant-matrix";
import {
  deliveryUrl,
  destroyImages,
  destroyProductFolder,
  isAuthenticUpload,
  productFolder,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import {
  type ProductFormData,
  type UploadedImage,
  type VariantMatrixData,
} from "@/server/validators/product";

/**
 * Dominio del admin de catálogo. Estas funciones NO comprueban permisos: las
 * llaman solo las Server Actions de src/app/admin/productos/actions.ts, que
 * ejecutan requireAdmin() antes. Los datos llegan ya validados con Zod.
 *
 * Orden de las fotos: `position` 0..n-1 sin huecos y la principal es siempre
 * la primera (`isMain = position === 0`), para que el admin y la tienda
 * muestren lo mismo.
 */

type Tx = Prisma.TransactionClient;

export type ProductStatusFilter = "todos" | "activos" | "borradores";

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  price: number;
  category: string;
  image: string | null;
  totalStock: number;
  variantCount: number;
  outOfStock: number;
  updatedAt: Date;
};

export async function listAdminProducts(filters: {
  q?: string;
  status: ProductStatusFilter;
}): Promise<AdminProductRow[]> {
  const where: Prisma.ProductWhereInput = {};
  if (filters.status !== "todos") where.active = filters.status === "activos";
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" } as const;
    where.OR = [{ name: contains }, { slug: contains }];
  }

  const rows = await prisma.product.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      basePrice: true,
      updatedAt: true,
      category: { select: { name: true } },
      images: {
        orderBy: { position: "asc" },
        take: 1,
        select: { url: true },
      },
      variants: { select: { stock: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    price: row.basePrice,
    category: row.category.name,
    image: row.images[0]?.url ?? null,
    totalStock: row.variants.reduce((sum, v) => sum + v.stock, 0),
    variantCount: row.variants.length,
    outOfStock: row.variants.filter((v) => v.stock === 0).length,
    updatedAt: row.updatedAt,
  }));
}

export async function getCategoryOptions() {
  return prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

export type AdminProductImage = {
  id: string;
  url: string;
  isMain: boolean;
  isPlaceholder: boolean;
};

export type AdminVariant = {
  id: string;
  color: string;
  colorHex: string | null;
  size: string;
  stock: number;
  sku: string | null;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string;
  active: boolean;
  images: AdminProductImage[];
  variants: AdminVariant[];
  hasOrders: boolean;
};

export async function getAdminProduct(
  id: string,
): Promise<AdminProduct | null> {
  const [product, orderCount] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        categoryId: true,
        active: true,
        images: {
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: { id: true, url: true, publicId: true, isMain: true },
        },
        variants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            color: true,
            colorHex: true,
            size: true,
            stock: true,
            sku: true,
          },
        },
      },
    }),
    prisma.orderItem.count({ where: { variant: { productId: id } } }),
  ]);
  if (!product) return null;

  const { basePrice, images, variants, ...rest } = product;
  return {
    ...rest,
    price: basePrice,
    images: images.map(({ publicId, ...image }) => ({
      ...image,
      isPlaceholder: publicId.startsWith("seed/"),
    })),
    variants: [...variants].sort((a, b) => compareSizes(a.size, b.size)),
    hasOrders: orderCount > 0,
  };
}

// ─── Producto ───────────────────────────────────────────────────────────────

export type ProductWriteResult =
  | { ok: true; id: string; slugs: string[] }
  | { ok: false; reason: "slug-taken" | "category-missing" | "not-found" };

function writeError(
  error: unknown,
): Extract<ProductWriteResult, { ok: false }> | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, reason: "slug-taken" };
    if (error.code === "P2003")
      return { ok: false, reason: "category-missing" };
    if (error.code === "P2025") return { ok: false, reason: "not-found" };
  }
  return null;
}

function productData(data: ProductFormData) {
  return {
    name: data.name,
    slug: data.slug,
    description: data.description,
    basePrice: data.price,
    categoryId: data.categoryId,
    active: data.active,
  };
}

export async function createProduct(
  data: ProductFormData,
): Promise<ProductWriteResult> {
  try {
    const product = await prisma.product.create({
      data: productData(data),
      select: { id: true, slug: true },
    });
    return { ok: true, id: product.id, slugs: [product.slug] };
  } catch (error) {
    const known = writeError(error);
    if (known) return known;
    throw error;
  }
}

export async function updateProduct(
  id: string,
  data: ProductFormData,
): Promise<ProductWriteResult> {
  const before = await prisma.product.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!before) return { ok: false, reason: "not-found" };

  try {
    const product = await prisma.product.update({
      where: { id },
      data: productData(data),
      select: { slug: true },
    });
    return { ok: true, id, slugs: [...new Set([before.slug, product.slug])] };
  } catch (error) {
    const known = writeError(error);
    if (known) return known;
    throw error;
  }
}

export type DeleteProductResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "not-found" | "has-orders" };

/**
 * Un producto con pedidos no se borra (las líneas de pedido apuntan a sus
 * variantes): se desactiva. Si se borra, sus fotos se eliminan de Cloudinary.
 */
export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!product) return { ok: false, reason: "not-found" };

  const orders = await prisma.orderItem.count({
    where: { variant: { productId: id } },
  });
  if (orders > 0) return { ok: false, reason: "has-orders" };

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    // Carrera: entró un pedido entre el conteo y el borrado (FK restrict).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { ok: false, reason: "has-orders" };
    }
    throw error;
  }

  // Borra lo registrado y también subidas huérfanas de la carpeta.
  await destroyProductFolder(id);
  return { ok: true, slug: product.slug };
}

// ─── Fotos ──────────────────────────────────────────────────────────────────

/** Reescribe posiciones 0..n-1 en el orden dado; la primera es la principal. */
async function writeImageOrder(tx: Tx, orderedIds: string[]) {
  for (const [position, id] of orderedIds.entries()) {
    await tx.productImage.update({
      where: { id },
      data: { position, isMain: position === 0 },
    });
  }
}

async function orderedImageIds(tx: Tx, productId: string) {
  const images = await tx.productImage.findMany({
    where: { productId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return images.map((image) => image.id);
}

export async function canUploadImages(
  productId: string,
): Promise<"ok" | "not-found" | "full"> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      images: {
        where: { NOT: { publicId: { startsWith: "seed/" } } },
        select: { id: true },
      },
    },
  });
  if (!product) return "not-found";
  return product.images.length >= MAX_PRODUCT_IMAGES ? "full" : "ok";
}

export type AttachImagesResult =
  | { ok: true; slug: string; added: number }
  | { ok: false; reason: "not-found" | "invalid-upload" | "too-many" };

/**
 * Registra fotos ya subidas a Cloudinary. Cada una debe venir firmada por
 * Cloudinary y estar en la carpeta del producto. La primera foto real retira
 * los placeholders del seed.
 */
export async function attachImages(
  productId: string,
  uploads: UploadedImage[],
): Promise<AttachImagesResult> {
  const folder = `${productFolder(productId)}/`;
  const authentic = uploads.every(
    (upload) => upload.publicId.startsWith(folder) && isAuthenticUpload(upload),
  );
  if (!authentic) return { ok: false, reason: "invalid-upload" };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!product) {
    // Se borró mientras se subía: no dejar huérfanos en Cloudinary.
    await destroyImages(uploads.map((upload) => upload.publicId));
    return { ok: false, reason: "not-found" };
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({
      where: { productId, publicId: { startsWith: "seed/" } },
    });
    const already = await tx.productImage.findMany({
      where: { productId, publicId: { in: uploads.map((u) => u.publicId) } },
      select: { publicId: true },
    });
    const known = new Set(already.map((image) => image.publicId));
    const fresh = uploads.filter((upload) => !known.has(upload.publicId));

    const count = await tx.productImage.count({ where: { productId } });
    if (count + fresh.length > MAX_PRODUCT_IMAGES) return "too-many" as const;

    for (const upload of fresh) {
      await tx.productImage.create({
        data: {
          productId,
          publicId: upload.publicId,
          url: deliveryUrl(upload.publicId, upload.version, upload.format),
          position: count + fresh.indexOf(upload),
        },
      });
    }
    await writeImageOrder(tx, await orderedImageIds(tx, productId));
    return fresh.length;
  });

  if (result === "too-many") {
    await destroyImages(uploads.map((upload) => upload.publicId));
    return { ok: false, reason: "too-many" };
  }
  return { ok: true, slug: product.slug, added: result };
}

export type ImageMutationResult =
  { ok: true; slug: string } | { ok: false; reason: "not-found" };

/** Mueve una foto una posición (o al principio, para hacerla principal). */
export async function moveImage(
  imageId: string,
  to: "up" | "down" | "first",
): Promise<ImageMutationResult> {
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { productId: true, product: { select: { slug: true } } },
  });
  if (!image) return { ok: false, reason: "not-found" };

  await prisma.$transaction(async (tx) => {
    const ids = await orderedImageIds(tx, image.productId);
    const index = ids.indexOf(imageId);
    const target = to === "first" ? 0 : to === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= ids.length) return;
    ids.splice(index, 1);
    ids.splice(target, 0, imageId);
    await writeImageOrder(tx, ids);
  });
  return { ok: true, slug: image.product.slug };
}

export async function deleteImage(
  imageId: string,
): Promise<ImageMutationResult> {
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: {
      productId: true,
      publicId: true,
      product: { select: { slug: true } },
    },
  });
  if (!image) return { ok: false, reason: "not-found" };

  await prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });
    await writeImageOrder(tx, await orderedImageIds(tx, image.productId));
  });
  // Después de la BD: si Cloudinary falla queda un huérfano, no una foto rota.
  await destroyImages([image.publicId]);
  return { ok: true, slug: image.product.slug };
}

// ─── Variantes ──────────────────────────────────────────────────────────────

export type SaveVariantsResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "blocked"; variants: VariantKey[] }
  | {
      ok: false;
      reason: "conflict";
      variants: (VariantKey & { current: number })[];
    };

class StockConflict extends Error {
  constructor(readonly variant: VariantKey & { current: number }) {
    super("Stock modificado durante la edición");
  }
}

/**
 * Guarda la matriz talla × color. El stock se escribe con
 * `UPDATE … WHERE id = $id AND stock = $expected`: si el checkout reservó
 * unidades mientras el admin editaba, no se pisa (conflicto → recargar).
 */
export async function saveVariants(
  productId: string,
  input: VariantMatrixData,
): Promise<SaveVariantsResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      slug: true,
      variants: {
        select: {
          id: true,
          color: true,
          colorHex: true,
          size: true,
          stock: true,
          _count: { select: { orderItems: true } },
        },
      },
    },
  });
  if (!product) return { ok: false, reason: "not-found" };

  const existing: ExistingVariant[] = product.variants.map(
    ({ _count, ...variant }) => ({
      ...variant,
      hasOrders: _count.orderItems > 0,
    }),
  );
  const plan = planVariantChanges(existing, input);
  if (plan.blocked.length > 0) {
    return { ok: false, reason: "blocked", variants: plan.blocked };
  }
  if (plan.conflicts.length > 0) {
    return { ok: false, reason: "conflict", variants: plan.conflicts };
  }

  const byId = new Map(existing.map((v) => [v.id, v]));
  try {
    await prisma.$transaction(async (tx) => {
      if (plan.remove.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: plan.remove }, productId },
        });
      }
      for (const update of plan.update) {
        if (update.colorHex !== undefined) {
          await tx.productVariant.update({
            where: { id: update.id },
            data: { colorHex: update.colorHex },
          });
        }
        if (update.stock) {
          const { count } = await tx.productVariant.updateMany({
            where: {
              id: update.id,
              ...(update.stock.expected !== null && {
                stock: update.stock.expected,
              }),
            },
            data: { stock: update.stock.value },
          });
          if (count === 0) {
            const variant = byId.get(update.id)!;
            const fresh = await tx.productVariant.findUnique({
              where: { id: update.id },
              select: { stock: true },
            });
            throw new StockConflict({
              color: variant.color,
              size: variant.size,
              current: fresh?.stock ?? 0,
            });
          }
        }
      }
      if (plan.create.length > 0) {
        await tx.productVariant.createMany({
          data: plan.create.map((variant) => ({ ...variant, productId })),
        });
      }
    });
  } catch (error) {
    if (error instanceof StockConflict) {
      return { ok: false, reason: "conflict", variants: [error.variant] };
    }
    // Carrera: entró un pedido en una variante que se iba a borrar.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { ok: false, reason: "blocked", variants: [] };
    }
    throw error;
  }

  return { ok: true, slug: product.slug };
}
