/** Reglas de las fotos de producto, compartidas por el admin y el servidor. */

export const MAX_PRODUCT_IMAGES = 8;
/** Límite de Cloudinary (plan gratuito) para imágenes. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Formatos que se firman en `allowed_formats` (Cloudinary rechaza el resto). */
export const UPLOAD_FORMATS = ["jpg", "png", "webp", "avif"] as const;
export type UploadFormat = (typeof UPLOAD_FORMATS)[number];

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * Fotos que se muestran con un color elegido, en su orden. Una foto con
 * `color: null` vale para todos los colores.
 * - Si el color tiene fotos propias: esas primero y después las generales.
 * - Si no: solo las generales; si tampoco hay, todas (mejor otra foto que
 *   ninguna).
 */
export function imagesForColor<T extends { color: string | null }>(
  images: T[],
  color: string | null | undefined,
): T[] {
  const general = images.filter((image) => image.color === null);
  const own = color ? images.filter((image) => image.color === color) : [];
  if (own.length > 0) return [...own, ...general];
  return general.length > 0 ? general : images;
}

/** Motivo por el que un archivo no se puede subir, o null si es válido. */
export function rejectFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Formato no admitido (usa JPG, PNG, WebP o AVIF).";
  }
  if (file.size > MAX_UPLOAD_BYTES) return "Pesa más de 10 MB.";
  return null;
}
