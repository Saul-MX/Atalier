"use server";

import { refresh } from "next/cache";

import { signUpload, type UploadSignature } from "@/lib/cloudinary";
import {
  type ActionError,
  requireAdmin,
  toActionError,
} from "@/server/auth/guards";
import { invalidateCatalog } from "@/server/catalog/invalidate";
import {
  folderFor,
  removeSiteImage,
  setSiteImage,
  siteImageTargetExists,
} from "@/server/services/site-content";
import { uploadedImageSchema } from "@/server/validators/product";
import { siteImageTargetSchema } from "@/server/validators/site";

/**
 * Server Actions de «Portada» (imágenes del hero y de las categorías). Como
 * las del catálogo: verifican el rol, validan con Zod, llaman al servicio e
 * invalidan la caché de la tienda.
 */

type ActionResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: string };

async function checkAdmin(): Promise<ActionError | null> {
  try {
    await requireAdmin();
    return null;
  } catch (error) {
    return toActionError(error);
  }
}

const INVALID = { ok: false, error: "Datos no válidos." } as const;
const GONE = {
  ok: false,
  error: "La categoría ya no existe. Recarga la página.",
} as const;

export async function getSiteUploadSignatureAction(
  target: unknown,
): Promise<ActionResult<{ upload: UploadSignature }>> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const parsed = siteImageTargetSchema.safeParse(target);
  if (!parsed.success) return INVALID;
  if (!(await siteImageTargetExists(parsed.data))) return GONE;

  return { ok: true, upload: signUpload(folderFor(parsed.data)) };
}

export async function saveSiteImageAction(
  target: unknown,
  upload: unknown,
): Promise<ActionResult> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const parsedTarget = siteImageTargetSchema.safeParse(target);
  const parsedUpload = uploadedImageSchema.safeParse(upload);
  if (!parsedTarget.success || !parsedUpload.success) return INVALID;

  const result = await setSiteImage(parsedTarget.data, parsedUpload.data);
  if (!result.ok) {
    return result.reason === "not-found"
      ? GONE
      : { ok: false, error: "La subida no es válida. Inténtalo de nuevo." };
  }

  invalidateCatalog();
  refresh();
  return { ok: true };
}

export async function removeSiteImageAction(
  target: unknown,
): Promise<ActionResult> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const parsed = siteImageTargetSchema.safeParse(target);
  if (!parsed.success) return INVALID;

  const result = await removeSiteImage(parsed.data);
  if (!result.ok) return GONE;

  invalidateCatalog();
  refresh();
  return { ok: true };
}
