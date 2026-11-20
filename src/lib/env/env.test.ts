// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Recarga los módulos para que la caché interna de serverEnv empiece vacía.
async function loadEnvModules() {
  vi.resetModules();
  const { serverEnv } = await import("./server");
  const { EnvError } = await import("./schema");
  return { serverEnv, EnvError };
}

describe("serverEnv", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", undefined);
    vi.stubEnv("DATABASE_URL", undefined);
  });

  it("devuelve el valor cuando es válido", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:6543/postgres");
    const { serverEnv } = await loadEnvModules();

    expect(serverEnv("DATABASE_URL")).toBe(
      "postgresql://u:p@localhost:6543/postgres",
    );
  });

  it("lanza EnvError si la variable falta o está vacía", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const { serverEnv, EnvError } = await loadEnvModules();

    expect(() => serverEnv("CRON_SECRET")).toThrow(EnvError);
    expect(() => serverEnv("DATABASE_URL")).toThrow(/DATABASE_URL/);
  });

  it("rechaza claves de Stripe que no sean de modo test", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_123");
    const { serverEnv } = await loadEnvModules();

    expect(() => serverEnv("STRIPE_SECRET_KEY")).toThrow(/modo test/);
  });

  it("rechaza la URL cloudinary:// en lugar del nombre del cloud", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "cloudinary://123:abc@demo");
    const { serverEnv } = await loadEnvModules();

    expect(() => serverEnv("CLOUDINARY_CLOUD_NAME")).toThrow(
      /nombre del cloud/,
    );
  });

  it("valida solo la variable solicitada (las demás pueden faltar)", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const { serverEnv } = await loadEnvModules();

    expect(serverEnv("STRIPE_SECRET_KEY")).toBe("sk_test_123");
  });
});
