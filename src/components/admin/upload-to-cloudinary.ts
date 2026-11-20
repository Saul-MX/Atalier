import { type UploadFormat } from "@/lib/catalog/product-images";
import { type UploadSignature } from "@/lib/cloudinary";

/** Lo que el servidor necesita para verificar y registrar una subida. */
export type CloudinaryUpload = {
  publicId: string;
  version: number;
  signature: string;
  format: UploadFormat;
};

/**
 * Sube un archivo DIRECTO del navegador a Cloudinary con una firma generada
 * en el servidor. Usa XHR (no fetch) para poder informar del progreso.
 */
export function uploadToCloudinary(
  file: File,
  upload: UploadSignature,
  onProgress: (fraction: number) => void,
): Promise<CloudinaryUpload> {
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", upload.apiKey);
  body.append("timestamp", String(upload.timestamp));
  body.append("signature", upload.signature);
  body.append("folder", upload.folder);
  body.append("allowed_formats", upload.allowedFormats);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", upload.uploadUrl);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new Error("Sin conexión con Cloudinary."));
    xhr.onload = () => {
      const response = xhr.response as {
        public_id?: string;
        version?: number;
        signature?: string;
        format?: string;
        error?: { message?: string };
      } | null;
      if (xhr.status >= 200 && xhr.status < 300 && response?.public_id) {
        resolve({
          publicId: response.public_id,
          version: response.version ?? 0,
          signature: response.signature ?? "",
          format: response.format as UploadFormat,
        });
      } else {
        reject(
          new Error(
            response?.error?.message?.includes("format")
              ? "Formato no admitido."
              : "Cloudinary rechazó el archivo.",
          ),
        );
      }
    };
    xhr.send(body);
  });
}
