import "server-only";

import {
  categoryFolder,
  deliveryUrl,
  destroyImages,
  heroFolder,
  isAuthenticUpload,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { HERO_KEY } from "@/lib/site-images";
import { type UploadedImage } from "@/server/validators/product";
import { type SiteImageTarget } from "@/server/validators/site";

/**
 * Imágenes editables de la portada: la del hero (tabla SiteImage, clave
 * "hero") y la de la tarjeta de cada categoría (Category.imageUrl). Se suben
 * a Cloudinary con el mismo flujo firmado que las fotos de producto.
 */

/** Carpeta de Cloudinary donde se firma la subida de cada imagen. */
export function folderFor(target: SiteImageTarget): string {
  return target.kind === "hero"
    ? heroFolder
    : categoryFolder(target.categoryId);
}

/** ¿Existe aún el destino? (una categoría puede haberse borrado). */
export async function siteImageTargetExists(
  target: SiteImageTarget,
): Promise<boolean> {
  if (target.kind === "hero") return true;
  const category = await prisma.category.findUnique({
    where: { id: target.categoryId },
    select: { id: true },
  });
  return category !== null;
}

export type SiteImageResult =
  { ok: true } | { ok: false; reason: "invalid-upload" | "not-found" };

/**
 * Guarda la imagen subida y borra de Cloudinary la anterior. La subida debe
 * venir firmada por Cloudinary y estar en la carpeta de su destino: así no se
 * puede asignar al hero una imagen ajena ni la de otra categoría.
 */
export async function setSiteImage(
  target: SiteImageTarget,
  upload: UploadedImage,
): Promise<SiteImageResult> {
  const folder = `${folderFor(target)}/`;
  if (!upload.publicId.startsWith(folder) || !isAuthenticUpload(upload)) {
    return { ok: false, reason: "invalid-upload" };
  }
  const url = deliveryUrl(upload.publicId, upload.version, upload.format);

  let previous: string | null;
  if (target.kind === "hero") {
    const current = await prisma.siteImage.findUnique({
      where: { key: HERO_KEY },
      select: { publicId: true },
    });
    previous = current?.publicId ?? null;
    await prisma.siteImage.upsert({
      where: { key: HERO_KEY },
      create: { key: HERO_KEY, url, publicId: upload.publicId },
      update: { url, publicId: upload.publicId },
    });
  } else {
    const category = await prisma.category.findUnique({
      where: { id: target.categoryId },
      select: { imagePublicId: true },
    });
    if (!category) {
      // Se borró mientras se subía: no dejar el archivo huérfano.
      await destroyImages([upload.publicId]);
      return { ok: false, reason: "not-found" };
    }
    previous = category.imagePublicId;
    await prisma.category.update({
      where: { id: target.categoryId },
      data: { imageUrl: url, imagePublicId: upload.publicId },
    });
  }

  // Después de la BD: si Cloudinary falla queda un huérfano, no una foto rota.
  if (previous && previous !== upload.publicId) await destroyImages([previous]);
  return { ok: true };
}

/** Quita la imagen (el hero vuelve al fondo liso; la categoría, a la foto de un producto). */
export async function removeSiteImage(
  target: SiteImageTarget,
): Promise<SiteImageResult> {
  let previous: string | null;
  if (target.kind === "hero") {
    const removed = await prisma.siteImage.findUnique({
      where: { key: HERO_KEY },
      select: { publicId: true },
    });
    previous = removed?.publicId ?? null;
    await prisma.siteImage.deleteMany({ where: { key: HERO_KEY } });
  } else {
    const category = await prisma.category.findUnique({
      where: { id: target.categoryId },
      select: { imagePublicId: true },
    });
    if (!category) return { ok: false, reason: "not-found" };
    previous = category.imagePublicId;
    await prisma.category.update({
      where: { id: target.categoryId },
      data: { imageUrl: null, imagePublicId: null },
    });
  }

  if (previous) await destroyImages([previous]);
  return { ok: true };
}

export type AdminSiteCategory = {
  id: string;
  name: string;
  /** Imagen subida para la tarjeta, o null. */
  image: string | null;
  /** Lo que muestra la portada sin imagen propia: la foto de un producto. */
  fallback: string | null;
};

/** Datos del editor de portada: solo las categorías que salen en ella. */
export async function getSiteContentForAdmin(): Promise<{
  hero: string | null;
  categories: AdminSiteCategory[];
}> {
  const [hero, categories] = await Promise.all([
    prisma.siteImage.findUnique({
      where: { key: HERO_KEY },
      select: { url: true },
    }),
    prisma.category.findMany({
      where: { products: { some: { active: true } } },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        imageUrl: true,
        products: {
          where: { active: true },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            images: {
              orderBy: [{ isMain: "desc" }, { position: "asc" }],
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    hero: hero?.url ?? null,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      image: category.imageUrl,
      fallback: category.products[0]?.images[0]?.url ?? null,
    })),
  };
}
