import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useCartStore } from "@/stores/cart";

import { ProductPurchase, type PurchaseProduct } from "./product-purchase";

const product: PurchaseProduct = {
  id: "prod-1",
  slug: "abrigo-lana",
  name: "Abrigo de lana",
  price: 489_900,
  image: "/seed/abrigo-1.svg",
  variants: [
    { id: "n-s", color: "Negro", colorHex: "#000", size: "S", stock: 2 },
    { id: "n-m", color: "Negro", colorHex: "#000", size: "M", stock: 0 },
    { id: "c-s", color: "Camel", colorHex: "#b98b5e", size: "S", stock: 0 },
    { id: "c-m", color: "Camel", colorHex: "#b98b5e", size: "M", stock: 5 },
  ],
};

function sizeGroup() {
  return screen.getByRole("group", { name: /talla/i });
}

describe("ProductPurchase", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false, hasHydrated: true });
  });

  it("habilita solo las tallas con stock del color elegido", async () => {
    const user = userEvent.setup();
    render(<ProductPurchase product={product} />);

    // Color inicial: Negro (primero con stock)
    expect(screen.getByRole("radio", { name: "Negro" })).toBeChecked();
    expect(within(sizeGroup()).getByRole("radio", { name: "S" })).toBeEnabled();
    expect(
      within(sizeGroup()).getByRole("radio", { name: "M, agotada" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "Camel" }));
    expect(
      within(sizeGroup()).getByRole("radio", { name: "S, agotada" }),
    ).toBeDisabled();
    expect(within(sizeGroup()).getByRole("radio", { name: "M" })).toBeEnabled();
  });

  it("pide una talla antes de añadir al carrito", async () => {
    const user = userEvent.setup();
    render(<ProductPurchase product={product} />);

    await user.click(
      screen.getByRole("button", { name: /añadir al carrito/i }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona una talla");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("añade la variante elegida, avisa de stock bajo y abre el carrito", async () => {
    const user = userEvent.setup();
    render(<ProductPurchase product={product} />);

    await user.click(within(sizeGroup()).getByRole("radio", { name: "S" }));
    expect(screen.getByText(/quedan 2 unidades/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /añadir al carrito/i }),
    );

    const { items, isOpen } = useCartStore.getState();
    expect(items).toEqual([
      expect.objectContaining({
        variantId: "n-s",
        color: "Negro",
        size: "S",
        quantity: 1,
        maxQuantity: 2,
      }),
    ]);
    expect(isOpen).toBe(true);
  });

  it("muestra el producto como agotado si no hay stock", () => {
    render(
      <ProductPurchase
        product={{
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            stock: 0,
          })),
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "Agotado" })).toBeDisabled();
  });
});
