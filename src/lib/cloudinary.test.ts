// @vitest-environment node
import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-secret";
const sha1 = (input: string) => createHash("sha1").update(input).digest("hex");

async function load() {
  vi.resetModules();
  return import("./cloudinary");
}

describe("cloudinary", () => {
  beforeEach(() => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "demo");
    vi.stubEnv("CLOUDINARY_API_KEY", "123456");
    vi.stubEnv("CLOUDINARY_API_SECRET", SECRET);
    vi.useFakeTimers({ now: new Date("2026-11-20T12:00:00Z") });
  });

  it("firma la subida acotada a la carpeta del producto y a formatos raster", async () => {
    const { signProductUpload } = await load();
    const upload = signProductUpload("prod_1");
    const timestamp = Math.round(Date.now() / 1000);

    expect(upload).toMatchObject({
      uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
      apiKey: "123456",
      folder: "atelier/products/prod_1",
      allowedFormats: "jpg,png,webp,avif",
      timestamp,
    });
    // Parámetros ordenados alfabéticamente + secreto (algoritmo de Cloudinary).
    expect(upload.signature).toBe(
      sha1(
        `allowed_formats=jpg,png,webp,avif&folder=atelier/products/prod_1&timestamp=${timestamp}${SECRET}`,
      ),
    );
  });

  it("acepta solo respuestas firmadas con nuestro secreto", async () => {
    const { isAuthenticUpload } = await load();
    const publicId = "atelier/products/prod_1/abc";
    const version = 1795165369;
    const signature = sha1(`public_id=${publicId}&version=${version}${SECRET}`);

    expect(isAuthenticUpload({ publicId, version, signature })).toBe(true);
    expect(
      isAuthenticUpload({ publicId: `${publicId}x`, version, signature }),
    ).toBe(false);
    expect(
      isAuthenticUpload({ publicId, version: version + 1, signature }),
    ).toBe(false);
    expect(isAuthenticUpload({ publicId, version, signature: "abc" })).toBe(
      false,
    );
  });

  it("construye la URL de entrega en el servidor", async () => {
    const { deliveryUrl, isCloudinaryAsset } = await load();
    expect(deliveryUrl("atelier/products/p/x", 12, "webp")).toBe(
      "https://res.cloudinary.com/demo/image/upload/v12/atelier/products/p/x.webp",
    );
    expect(isCloudinaryAsset("seed/abrigo-1")).toBe(false);
    expect(isCloudinaryAsset("atelier/products/p/x")).toBe(true);
  });
});
