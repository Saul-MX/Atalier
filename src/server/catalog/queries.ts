import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { type Prisma } from "@/generated/prisma/client";
import { type CatalogFilters, PAGE_SIZE } from "@/lib/catalog/filters";
import { imagesForColor } from "@/lib/catalog/product-images";
import { compareSizes } from "@/lib/catalog/sizes";
import { withLeadColor } from "@/lib/catalog/variants";
import {
  type CatalogFacets,
  type CatalogPageData,
  type CategoryHighlight,
  type CategorySummary,
  type ColorSwatch,
  type ModelSibling,
  type ProductCardData,
  type ProductDetailData,
  type SearchResult,
} from "@/lib/catalog/types";
import { prisma } from "@/lib/prisma";
import { HERO_KEY } from "@/lib/site-images";

/**
 * Lecturas públicas del catálogo, cacheadas con `use cache`.
 * Invalidación: el admin (Fase 4) y el checkout/webhook (Fase 5) llaman a
 * `revalidateTag(CATALOG_TAG)` cuando cambian productos o stock. El stock que
 * se muestra es orientativo: el checkout siempre lo verifica en la BD.
 */
export const CATALOG_TAG = "catalog";
export const productTag = (slug: string) => `product:${slug}`;

const imageOrder = [
  { isMain: "desc" },
  { position: "asc" },
] satisfies Prisma.ProductImageOrderByWithRelationInput[];

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  basePrice: true,
  category: { select: { name: true, slug: true } },
  // Todas (máx. MAX_PRODUCT_IMAGES): al filtrar por color se elige su foto.
  images: { orderBy: imageOrder, select: { url: true, color: true } },
  variants: { select: { color: true, colorHex: true, stock: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

function uniqueColors(
  variants: { color: string; colorHex: string | null }[],
): ColorSwatch[] {
  const seen = new Map<string, ColorSwatch>();
  for (const v of variants) {
    if (!seen.has(v.color))
      seen.set(v.color, { name: v.color, hex: v.colorHex });
  }
  return [...seen.values()];
}

/**
 * Foto de la tarjeta: la principal o, al filtrar por color, la del primer
 * color filtrado que tenga fotos propias.
 */
function cardImages(images: CardRow["images"], colors: string[] = []) {
  const color = colors.find((name) =>
    images.some((image) => image.color === name),
  );
  const shown = color ? imagesForColor(images, color) : images;
  return shown.slice(0, 1).map((image) => image.url);
}

function toCard(row: CardRow, colors?: string[]): ProductCardData {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: row.basePrice,
    category: row.category,
    images: cardImages(row.images, colors),
    colors: uniqueColors(row.variants),
    inStock: row.variants.some((v) => v.stock > 0),
  };
}

export async function getCategories(): Promise<CategorySummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  // Solo categorías con productos a la venta (las retiradas no se enlazan).
  return prisma.category.findMany({
    where: { products: { some: { active: true } } },
    select: { name: true, slug: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

export async function getCategoryHighlights(): Promise<CategoryHighlight[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      // Imagen subida desde el admin («Portada»); si no hay, la de su producto
      // más antiguo, para no repetir las de «Novedades» en la home.
      imageUrl: true,
      _count: { select: { products: { where: { active: true } } } },
      products: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          images: { orderBy: imageOrder, take: 1, select: { url: true } },
        },
      },
    },
  });

  return categories
    .filter((c) => c._count.products > 0)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      productCount: c._count.products,
      image: c.imageUrl ?? c.products[0]?.images[0]?.url ?? null,
    }));
}

/** Imagen del hero de la portada (subida desde «Portada»), o null. */
export async function getHeroImage(): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const hero = await prisma.siteImage.findUnique({
    where: { key: HERO_KEY },
    select: { url: true },
  });
  return hero?.url ?? null;
}

export async function getNewArrivals(limit = 8): Promise<ProductCardData[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map((row) => toCard(row));
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const activeVariant = { product: { active: true } } as const;
  const [categories, colors, sizes, price] = await Promise.all([
    getCategories(),
    prisma.productVariant.findMany({
      where: activeVariant,
      distinct: ["color"],
      select: { color: true, colorHex: true },
      orderBy: { color: "asc" },
    }),
    prisma.productVariant.findMany({
      where: activeVariant,
      distinct: ["size"],
      select: { size: true },
    }),
    prisma.product.aggregate({
      where: { active: true },
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
  ]);

  return {
    categories,
    colors: colors.map((c) => ({ name: c.color, hex: c.colorHex })),
    sizes: sizes.map((s) => s.size).sort(compareSizes),
    priceRange: {
      min: price._min.basePrice ?? 0,
      max: price._max.basePrice ?? 0,
    },
  };
}

function catalogWhere(filters: CatalogFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { active: true };

  if (filters.category) where.category = { slug: filters.category };

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.basePrice = { gte: filters.minPrice, lte: filters.maxPrice };
  }

  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" } as const;
    where.OR = [
      { name: contains },
      { description: contains },
      { category: { name: contains } },
    ];
  }

  // Color y talla deben cumplirse en la MISMA variante y con stock disponible.
  if (filters.colors.length > 0 || filters.sizes.length > 0) {
    where.variants = {
      some: {
        stock: { gt: 0 },
        ...(filters.colors.length > 0 && { color: { in: filters.colors } }),
        ...(filters.sizes.length > 0 && { size: { in: filters.sizes } }),
      },
    };
  }

  return where;
}

const sortOrder: Record<
  CatalogFilters["sort"],
  Prisma.ProductOrderByWithRelationInput[]
> = {
  novedades: [{ createdAt: "desc" }, { id: "asc" }],
  "precio-asc": [{ basePrice: "asc" }, { id: "asc" }],
  "precio-desc": [{ basePrice: "desc" }, { id: "asc" }],
};

export async function getCatalogPage(
  filters: CatalogFilters,
): Promise<CatalogPageData> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const where = catalogWhere(filters);
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: sortOrder[filters.sort],
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: cardSelect,
    }),
  ]);

  return {
    items: rows.map((row) => toCard(row, filters.colors)),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetailData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG, productTag(slug));

  const product = await prisma.product.findFirst({
    where: { slug, active: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      basePrice: true,
      model: true,
      category: { select: { name: true, slug: true } },
      images: {
        orderBy: imageOrder,
        select: { id: true, url: true, color: true },
      },
      variants: {
        select: {
          id: true,
          size: true,
          color: true,
          colorHex: true,
          stock: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!product) return null;

  const { basePrice, model, ...rest } = product;
  const siblings = model
    ? await getModelSiblings(model, product.id, product.variants)
    : [];
  return { ...rest, price: basePrice, siblings };
}

/**
 * Los demás productos activos del mismo modelo, uno por muestra de color: el
 * color de su foto principal (o su primer color). Se omiten colores que el
 * producto actual ya tiene.
 */
async function getModelSiblings(
  model: string,
  productId: string,
  ownVariants: { color: string }[],
): Promise<ModelSibling[]> {
  const rows = await prisma.product.findMany({
    where: { model, active: true, id: { not: productId } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      slug: true,
      name: true,
      images: { orderBy: imageOrder, take: 1, select: { color: true } },
      variants: {
        orderBy: { id: "asc" },
        select: { color: true, colorHex: true, stock: true },
      },
    },
  });

  const taken = new Set(ownVariants.map((variant) => variant.color));
  const siblings: ModelSibling[] = [];
  for (const row of rows) {
    const [lead] = withLeadColor(row.variants, row.images[0]?.color);
    if (!lead || taken.has(lead.color)) continue;
    taken.add(lead.color);
    siblings.push({
      slug: row.slug,
      name: row.name,
      color: lead.color,
      hex: lead.colorHex,
      available: row.variants.some((variant) => variant.stock > 0),
    });
  }
  return siblings;
}

/** Slugs activos, para pre-renderizar las fichas en el build. */
export async function getActiveProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const rows = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

export async function getRelatedProducts(
  categorySlug: string,
  excludeSlug: string,
  limit = 4,
): Promise<ProductCardData[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const rows = await prisma.product.findMany({
    where: {
      active: true,
      category: { slug: categorySlug },
      slug: { not: excludeSlug },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map((row) => toCard(row));
}

export async function searchProducts(
  q: string,
  limit = 6,
): Promise<SearchResult[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const contains = { contains: q, mode: "insensitive" } as const;
  const rows = await prisma.product.findMany({
    where: {
      active: true,
      OR: [{ name: contains }, { category: { name: contains } }],
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
    select: {
      slug: true,
      name: true,
      basePrice: true,
      category: { select: { name: true } },
      images: { orderBy: imageOrder, take: 1, select: { url: true } },
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    price: row.basePrice,
    category: row.category.name,
    image: row.images[0]?.url ?? null,
  }));
}

/** Productos activos con su fecha de modificación, para sitemap.xml. */
export async function getSitemapProducts(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  return prisma.product.findMany({
    where: { active: true },
    orderBy: { slug: "asc" },
    select: { slug: true, updatedAt: true },
  });
}
