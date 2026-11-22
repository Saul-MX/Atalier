import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const saveVariantsAction = vi.hoisted(() =>
  vi.fn(async () => ({ ok: true as const, message: "Variantes guardadas." })),
);
vi.mock("@/app/admin/productos/actions", () => ({
  saveVariantsAction,
  attachImagesAction: vi.fn(),
  getUploadSignatureAction: vi.fn(),
  renameColorAction: vi.fn(),
}));

const { VariantMatrix } = await import("./variant-matrix");

describe("VariantMatrix sin colores", () => {
  it("arranca con una fila para escribir su único color, sin marcar cambios", async () => {
    const user = userEvent.setup();
    render(<VariantMatrix productId="p1" variants={[]} colorPhotos={{}} />);
    expect(screen.getByText("Elige al menos una talla.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "M" }));
    expect(screen.getByLabelText("Nombre del color nuevo")).toHaveValue("");
    expect(screen.queryByText("Cambios sin guardar")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Guardar variantes" }),
    ).toBeDisabled();
  });

  it("se guarda con un solo color y el stock de cada talla", async () => {
    const user = userEvent.setup();
    render(<VariantMatrix productId="p1" variants={[]} colorPhotos={{}} />);

    await user.click(screen.getByRole("button", { name: "S" }));
    await user.click(screen.getByRole("button", { name: "M" }));
    await user.type(
      screen.getByLabelText("Nombre del color nuevo"),
      "Washed Black",
    );
    const stockS = screen.getByLabelText("Stock de Washed Black, talla S");
    await user.clear(stockS);
    await user.type(stockS, "5");
    await user.click(screen.getByRole("button", { name: "Guardar variantes" }));

    await waitFor(() => expect(saveVariantsAction).toHaveBeenCalledTimes(1));
    expect(saveVariantsAction).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({
        colors: [{ name: "Washed Black", hex: "#888888" }],
        sizes: ["S", "M"],
        cells: [
          expect.objectContaining({
            color: "Washed Black",
            size: "S",
            stock: 5,
          }),
          expect.objectContaining({
            color: "Washed Black",
            size: "M",
            stock: 0,
          }),
        ],
      }),
    );
  });
});
