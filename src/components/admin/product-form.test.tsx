import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const saveProductAction = vi.hoisted(() =>
  vi.fn(async () => ({ ok: true as const, message: "Cambios guardados." })),
);
vi.mock("@/app/admin/productos/actions", () => ({ saveProductAction }));

// El Switch de Radix mide su tamaño; jsdom no tiene ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { ProductForm } = await import("./product-form");

const categories = [
  { id: "cat-mujer", name: "Mujer" },
  { id: "cat-gorras", name: "Gorras" },
];

const product = {
  id: "prod-1",
  name: "Gorra de lana",
  slug: "gorra-lana",
  description: "Gorra de lana merino con doblez.",
  price: 69_000,
  categoryId: "cat-gorras",
  active: true,
  model: "Gorra lana",
};

describe("ProductForm", () => {
  it("guardar dos veces no cambia la categoría ni el modelo", async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        product={product}
        categories={categories}
        models={["Gorra lana"]}
      />,
    );
    const save = screen.getByRole("button", { name: "Guardar cambios" });

    await user.click(save);
    await waitFor(() => expect(saveProductAction).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Categoría")).toHaveValue("cat-gorras");

    await user.click(save);
    await waitFor(() => expect(saveProductAction).toHaveBeenCalledTimes(2));

    const sent = saveProductAction.mock.calls.map(
      (call) => (call as unknown[])[1] as FormData,
    );
    for (const data of sent) {
      expect(data.get("categoryId")).toBe("cat-gorras");
      expect(data.get("model")).toBe("Gorra lana");
    }
  });
});
