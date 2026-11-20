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
