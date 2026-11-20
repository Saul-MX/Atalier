// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, services, updateTag, refresh, redirect, sign } = vi.hoisted(
  () => ({
    getSession: vi.fn(),
    services: {
      attachImages: vi.fn(),
      canUploadImages: vi.fn(),
      createProduct: vi.fn(),
      deleteImage: vi.fn(),
      deleteProduct: vi.fn(),
      moveImage: vi.fn(),
      saveVariants: vi.fn(),
      updateProduct: vi.fn(),
    },
    updateTag: vi.fn(),
    refresh: vi.fn(),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    sign: vi.fn(() => ({ signature: "sig" })),
  }),
);

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ updateTag, refresh }));
vi.mock("@/server/services/admin-products", () => services);
vi.mock("@/lib/cloudinary", () => ({ signProductUpload: sign }));
vi.mock("@/server/catalog/queries", () => ({
  CATALOG_TAG: "catalog",
  productTag: (slug: string) => `product:${slug}`,
}));

const actions = await import("./actions");

const asRole = (role: string | null) =>
  getSession.mockResolvedValue({
    session: { id: "s1", userId: "u1" },
    user: { id: "u1", name: "Ana", email: "ana@example.com", role },
  });

function productForm(fields: Record<string, string> = {}) {
  const data = new FormData();
  const values = {
    name: "Abrigo",
    slug: "",
    description: "Abrigo largo de lana.",
    price: "1299",
    categoryId: "cat_1",
    ...fields,
  };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const calls: [string, () => Promise<unknown>][] = [
  ["saveProductAction", () => actions.saveProductAction(null, productForm())],
  ["deleteProductAction", () => actions.deleteProductAction("p1")],
  ["getUploadSignatureAction", () => actions.getUploadSignatureAction("p1")],
  ["attachImagesAction", () => actions.attachImagesAction("p1", [])],
  ["moveImageAction", () => actions.moveImageAction("i1", "up")],
  ["deleteImageAction", () => actions.deleteImageAction("i1")],
  ["saveVariantsAction", () => actions.saveVariantsAction("p1", {})],
];

describe("Server Actions del catálogo: autorización", () => {
  beforeEach(() => {
    getSession.mockReset();
    for (const fn of Object.values(services)) fn.mockReset();
  });

  it.each(calls)("%s → 401 sin sesión", async (_, call) => {
    getSession.mockResolvedValue(null);
    await expect(call()).resolves.toMatchObject({ ok: false, status: 401 });
  });

  it.each(calls)("%s → 403 sin rol admin", async (_, call) => {
    asRole("user");
    await expect(call()).resolves.toMatchObject({ ok: false, status: 403 });
  });

  it("ningún servicio se ejecuta sin permisos", async () => {
    asRole("user");
    for (const [, call] of calls) await call();
    for (const fn of Object.values(services)) expect(fn).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("Server Actions del catálogo: validación e invalidación", () => {
  beforeEach(() => {
    asRole("admin");
    for (const fn of Object.values(services)) fn.mockReset();
    updateTag.mockClear();
    refresh.mockClear();
  });

  it("devuelve errores de campo sin tocar la BD", async () => {
    const result = await actions.saveProductAction(
      null,
      productForm({ price: "gratis" }),
    );
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { price: expect.stringContaining("no válido") },
    });
    expect(services.createProduct).not.toHaveBeenCalled();
  });

  it("slug duplicado → error en el campo slug", async () => {
    services.createProduct.mockResolvedValue({
      ok: false,
      reason: "slug-taken",
    });
    const result = await actions.saveProductAction(null, productForm());
    expect(result).toMatchObject({ fieldErrors: { slug: expect.any(String) } });
  });

  it("al crear, invalida la caché y redirige a la edición", async () => {
    services.createProduct.mockResolvedValue({
      ok: true,
      id: "p9",
      slugs: ["abrigo"],
    });
    await expect(
      actions.saveProductAction(null, productForm()),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/productos/p9?creado=1");
    expect(services.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "abrigo", price: 129900, active: false }),
    );
    expect(updateTag).toHaveBeenCalledWith("catalog");
    expect(updateTag).toHaveBeenCalledWith("product:abrigo");
  });

  it("al cambiar el slug invalida el antiguo y el nuevo", async () => {
    services.updateProduct.mockResolvedValue({
      ok: true,
      id: "p1",
      slugs: ["viejo", "nuevo"],
    });
    const data = productForm({ slug: "nuevo" });
    data.set("id", "p1");
    await expect(actions.saveProductAction(null, data)).resolves.toMatchObject({
      ok: true,
    });
    expect(updateTag).toHaveBeenCalledWith("product:viejo");
    expect(updateTag).toHaveBeenCalledWith("product:nuevo");
    expect(refresh).toHaveBeenCalled();
  });

  it("rechaza subidas mal formadas antes de llegar al servicio", async () => {
    const result = await actions.attachImagesAction("p1", [
      { publicId: "x", version: 1, signature: "nope", format: "svg" },
    ]);
    expect(result).toMatchObject({ ok: false });
    expect(services.attachImages).not.toHaveBeenCalled();
  });

  it("rechaza una dirección de movimiento desconocida", async () => {
    const result = await actions.moveImageAction(
      "i1",
      "sideways" as unknown as "up",
    );
    expect(result).toMatchObject({ ok: false });
    expect(services.moveImage).not.toHaveBeenCalled();
  });

  it("explica el conflicto de stock con el valor actual", async () => {
    services.saveVariants.mockResolvedValue({
      ok: false,
      reason: "conflict",
      variants: [{ color: "Negro", size: "M", current: 2 }],
    });
    const result = await actions.saveVariantsAction("p1", {
      colors: [{ name: "Negro", hex: "#000000" }],
      sizes: ["M"],
      cells: [{ color: "Negro", size: "M", stock: 5, expected: 3 }],
    });
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("Negro / M ahora tiene 2"),
    });
  });
});
