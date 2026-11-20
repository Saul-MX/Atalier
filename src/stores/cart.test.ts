import { beforeEach, describe, expect, it } from "vitest";

import { type CartItem, cartCount, cartSubtotal, useCartStore } from "./cart";

const item = (
  overrides: Partial<Omit<CartItem, "quantity">> = {},
): Omit<CartItem, "quantity"> => ({
  variantId: "var-1",
  productId: "prod-1",
  slug: "abrigo",
  name: "Abrigo",
  color: "Negro",
  size: "M",
  image: null,
  unitPrice: 100_000,
  maxQuantity: 3,
  ...overrides,
});

describe("carrito", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ items: [], isOpen: false, hasHydrated: true });
  });

  it("añade artículos y agrupa la misma variante", () => {
    const { addItem } = useCartStore.getState();
    expect(addItem(item())).toBe("added");
    expect(addItem(item())).toBe("added");
    expect(addItem(item({ variantId: "var-2", size: "L" }))).toBe("added");

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(2);
    expect(items[0]?.quantity).toBe(2);
    expect(cartCount(items)).toBe(3);
    expect(cartSubtotal(items)).toBe(300_000);
  });

  it("no supera el stock conocido", () => {
    const { addItem } = useCartStore.getState();
    expect(addItem(item(), 5)).toBe("capped");
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
    expect(addItem(item())).toBe("capped");
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
  });

  it("rechaza variantes sin stock", () => {
    expect(useCartStore.getState().addItem(item({ maxQuantity: 0 }))).toBe(
      "unavailable",
    );
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("ajusta cantidades y elimina al llegar a 0", () => {
    const { addItem, setQuantity } = useCartStore.getState();
    addItem(item(), 2);
    setQuantity("var-1", 99);
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
    setQuantity("var-1", 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("persiste solo los artículos en localStorage", () => {
    useCartStore.getState().addItem(item());
    useCartStore.getState().open();

    const stored = JSON.parse(localStorage.getItem("atelier-cart") ?? "{}") as {
      state: Record<string, unknown>;
    };
    expect(Object.keys(stored.state)).toEqual(["items"]);
  });
});
