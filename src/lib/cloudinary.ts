import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { v2 as cloudinary } from "cloudinary";

import {
  UPLOAD_FORMATS,
  type UploadFormat,
} from "@/lib/catalog/product-images";
import { serverEnv } from "@/lib/env/server";

/**
 * Cloudinary (solo servidor). Flujo de subida firmada:
 * 1. El servidor firma {folder, timestamp, allowed_formats} con el secreto.
 * 2. El navegador sube el archivo DIRECTO a Cloudinary con esa firma
 *    (no pasa por la función serverless).
 * 3. El navegador manda al servidor la respuesta de Cloudinary; el servidor
 *    verifica su firma (public_id + version) antes de guardarla en la BD, y
 *    construye la URL él mismo: nunca se guarda una URL que mande el cliente.
 */

/** Las fotos de cada producto viven bajo su propia carpeta. */
export const productFolder = (productId: string) =>
  `atelier/products/${productId}`;

let configured = false;
function client() {
  if (!configured) {
    cloudinary.config({
      cloud_name: serverEnv("CLOUDINARY_CLOUD_NAME"),
      api_key: serverEnv("CLOUDINARY_API_KEY"),
      api_secret: serverEnv("CLOUDINARY_API_SECRET"),
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export type UploadSignature = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
};

/** Firma válida ~1 h (Cloudinary rechaza timestamps más antiguos). */
export function signProductUpload(productId: string): UploadSignature {
  const params = {
    timestamp: Math.round(Date.now() / 1000),
    folder: productFolder(productId),
    allowed_formats: UPLOAD_FORMATS.join(","),
  };
  const signature = client().utils.api_sign_request(
    params,
    serverEnv("CLOUDINARY_API_SECRET"),
  );
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${serverEnv("CLOUDINARY_CLOUD_NAME")}/image/upload`,
    apiKey: serverEnv("CLOUDINARY_API_KEY"),
    timestamp: params.timestamp,
    signature,
    folder: params.folder,
    allowedFormats: params.allowed_formats,
  };
}

/**
 * true si la respuesta de subida la firmó Cloudinary con nuestro secreto:
 * sha1("public_id=…&version=…" + secreto), igual que
 * `utils.verify_api_response_signature` del SDK (que no está tipada).
 */
export function isAuthenticUpload(upload: {
  publicId: string;
  version: number;
  signature: string;
}): boolean {
  const expected = createHash("sha1")
    .update(
      `public_id=${upload.publicId}&version=${upload.version}${serverEnv("CLOUDINARY_API_SECRET")}`,
    )
    .digest();
  const received = Buffer.from(upload.signature, "hex");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

export function deliveryUrl(
  publicId: string,
  version: number,
  format: UploadFormat,
): string {
  return `https://res.cloudinary.com/${serverEnv("CLOUDINARY_CLOUD_NAME")}/image/upload/v${version}/${publicId}.${format}`;
}

/**
 * Las imágenes provisionales del seed ("seed/…") son archivos locales de
 * public/seed/: nunca existen en Cloudinary y no se borran allí.
 */
export const isCloudinaryAsset = (publicId: string) =>
  !publicId.startsWith("seed/");

/** Borra recursos; los errores se registran y no se propagan (best effort). */
export async function destroyImages(publicIds: string[]): Promise<void> {
  const ids = publicIds.filter(isCloudinaryAsset);
  if (ids.length === 0) return;
  try {
    await client().api.delete_resources(ids, { invalidate: true });
  } catch (error) {
    console.error("[cloudinary] No se pudieron borrar recursos", ids, error);
  }
}

/**
 * Borra todo lo subido para un producto (incluidas subidas huérfanas) y
 * después la carpeta, que ya queda vacía.
 */
export async function destroyProductFolder(productId: string): Promise<void> {
  const folder = productFolder(productId);
  try {
    await client().api.delete_resources_by_prefix(`${folder}/`, {
      invalidate: true,
    });
    await client().api.delete_folder(folder);
  } catch (error) {
    console.error(
      "[cloudinary] No se pudo vaciar la carpeta",
      productId,
      error,
    );
  }
}
