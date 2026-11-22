"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { MAX_PRODUCT_IMAGES } from "@/lib/catalog/product-images";
import { signProductUpload, type UploadSignature } from "@/lib/cloudinary";
import { type FieldErrors, fieldErrors } from "@/lib/validation";
import {
  type ActionError,
  requireAdmin,
  toActionError,
} from "@/server/auth/guards";
import { invalidateCatalog } from "@/server/catalog/invalidate";
import {
  attachImages,
  canUploadImages,
  createProduct,
  deleteImage,
  deleteProduct,
  moveImage,
  saveVariants,
  setImageColor,
  updateProduct,
} from "@/server/services/admin-products";
import {
  idSchema,
  imageColorSchema,
  parseProductForm,
  uploadedImagesSchema,
  variantMatrixSchema,
} from "@/server/validators/product";

/**
 * Server Actions del admin de catálogo. Cada una:
 * 1. verifica el rol con requireAdmin() (el proxy y el layout NO protegen),
 * 2. valida la entrada con Zod (llega del navegador),
 * 3. llama al servicio de dominio,
 * 4. invalida la caché de la tienda y refresca la vista.
 */

export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; status?: number; fieldErrors?: FieldErrors };

async function checkAdmin(): Promise<ActionError | null> {
  try {
    await requireAdmin();
    return null;
  } catch (error) {
    return toActionError(error);
  }
}

const NOT_FOUND = {
  ok: false,
  error: "El producto ya no existe. Recarga la página.",
} as const;
const INVALID = { ok: false, error: "Datos no válidos." } as const;

// ─── Producto ───────────────────────────────────────────────────────────────

export type ProductFormState = ActionResult<{ message: string }> | null;

/** Crea (sin `id`) o actualiza (con `id`) un producto. Para useActionState. */
export async function saveProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const rawId = formData.get("id");
  const id = rawId === null || rawId === "" ? null : idSchema.safeParse(rawId);
  if (id && !id.success) return INVALID;

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const result = id
    ? await updateProduct(id.data, parsed.data)
    : await createProduct(parsed.data);

  if (!result.ok) {
    switch (result.reason) {
      case "slug-taken":
        return {
          ok: false,
          error: "Revisa los campos marcados.",
          fieldErrors: { slug: "Ya existe un producto con este slug." },
        };
      case "category-missing":
        return {
          ok: false,
          error: "Revisa los campos marcados.",
          fieldErrors: { categoryId: "La categoría ya no existe." },
        };
      case "not-found":
        return NOT_FOUND;
    }
  }

  invalidateCatalog(...result.slugs);
  if (!id) redirect(`/admin/productos/${result.id}?creado=1`);

  refresh();
  return { ok: true, message: "Cambios guardados." };
}

export async function deleteProductAction(
  productId: string,
): Promise<ActionResult> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse(productId);
  if (!id.success) return INVALID;

  const result = await deleteProduct(id.data);
  if (!result.ok) {
    return result.reason === "has-orders"
      ? {
          ok: false,
          error:
            "Este producto tiene pedidos y no se puede eliminar. Desactívalo para ocultarlo de la tienda.",
        }
      : NOT_FOUND;
  }

  invalidateCatalog(result.slug);
  redirect("/admin/productos?eliminado=1");
}

// ─── Fotos ──────────────────────────────────────────────────────────────────

export async function getUploadSignatureAction(
  productId: string,
): Promise<ActionResult<{ upload: UploadSignature }>> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse(productId);
  if (!id.success) return INVALID;

  const status = await canUploadImages(id.data);
  if (status === "not-found") return NOT_FOUND;
  if (status === "full") {
    return {
      ok: false,
      error: `Este producto ya tiene el máximo de ${MAX_PRODUCT_IMAGES} fotos.`,
    };
  }
  return { ok: true, upload: signProductUpload(id.data) };
}

export async function attachImagesAction(
  productId: string,
  uploads: unknown,
  color: string | null = null,
): Promise<ActionResult<{ added: number }>> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse(productId);
  const images = uploadedImagesSchema.safeParse(uploads);
  const parsedColor = imageColorSchema.safeParse(color);
  if (!id.success || !images.success || !parsedColor.success) return INVALID;

  const result = await attachImages(id.data, images.data, parsedColor.data);
  if (!result.ok) {
    switch (result.reason) {
      case "unknown-color":
        return {
          ok: false,
          error: "Ese color ya no existe en las variantes. Recarga la página.",
        };
      case "invalid-upload":
        return {
          ok: false,
          error: "La subida no es válida. Inténtalo de nuevo.",
        };
      case "too-many":
        return {
          ok: false,
          error: `Superarías el máximo de ${MAX_PRODUCT_IMAGES} fotos por producto.`,
        };
      case "not-found":
        return NOT_FOUND;
    }
  }

  invalidateCatalog(result.slug);
  refresh();
  return { ok: true, added: result.added };
}

const IMAGE_GONE = {
  ok: false,
  error: "La foto ya no existe. Recarga la página.",
} as const;

export async function moveImageAction(
  imageId: string,
  to: "up" | "down" | "first",
): Promise<ActionResult> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse(imageId);
  if (!id.success || !["up", "down", "first"].includes(to)) return INVALID;

  const result = await moveImage(id.data, to);
  if (!result.ok) return IMAGE_GONE;

  invalidateCatalog(result.slug);
  refresh();
  return { ok: true };
}

export async function deleteImageAction(
  imageId: string,
): Promise<ActionResult> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse(imageId);
  if (!id.success) return INVALID;

  const result = await deleteImage(id.data);
  if (!result.ok) return IMAGE_GONE;

  invalidateCatalog(result.slug);
  refresh();
  return { ok: true };
}

export async function setImageColorAction(
  imageId: string,
  color: string | null,
): Promise<ActionResult> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse(imageId);
  const parsedColor = imageColorSchema.safeParse(color);
  if (!id.success || !parsedColor.success) return INVALID;

  const result = await setImageColor(id.data, parsedColor.data);
  if (!result.ok) {
    return result.reason === "unknown-color"
      ? {
          ok: false,
          error: "Ese color ya no existe en las variantes. Recarga la página.",
        }
      : IMAGE_GONE;
  }

  invalidateCatalog(result.slug);
  refresh();
  return { ok: true };
}

// ─── Variantes ──────────────────────────────────────────────────────────────

const variantLabel = (v: { color: string; size: string }) =>
  `${v.color} / ${v.size}`;

export async function saveVariantsAction(
  productId: string,
  matrix: unknown,
): Promise<ActionResult<{ message: string }>> {
  const denied = await checkAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse(productId);
  if (!id.success) return INVALID;
  const parsed = variantMatrixSchema.safeParse(matrix);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? INVALID.error,
    };
  }

  const result = await saveVariants(id.data, parsed.data);
  if (!result.ok) {
    switch (result.reason) {
      case "not-found":
        return NOT_FOUND;
      case "blocked":
        return {
          ok: false,
          error:
            result.variants.length > 0
              ? `No se pueden quitar variantes con pedidos (${result.variants.map(variantLabel).join(", ")}). Pon su stock a 0.`
              : "Una variante que quitaste recibió un pedido. Recarga la página.",
        };
      case "conflict":
        return {
          ok: false,
          error: `El stock cambió mientras editabas (probablemente por una venta): ${result.variants
            .map((v) => `${variantLabel(v)} ahora tiene ${v.current}`)
            .join(", ")}. Recarga la página y vuelve a aplicar tus cambios.`,
        };
    }
  }

  invalidateCatalog(result.slug);
  refresh();
  return { ok: true, message: "Variantes guardadas." };
}
