import { beforeEach, describe, expect, it } from "vitest";

import {
  type CartItem,
  cartCount,
  cartSubtotal,
  takeCartReturnFocus,
  useCartStore,
} from "./cart";

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

  it("se ajusta al stock real que informa el servidor (409)", () => {
    const { addItem, limitToStock } = useCartStore.getState();
    addItem(item(), 3);
    addItem(item({ variantId: "var-2", size: "L" }), 2);
    addItem(item({ variantId: "var-3", size: "S" }), 1);

    limitToStock([
      { variantId: "var-1", available: 1 },
      { variantId: "var-2", available: 0 },
    ]);

    const { items } = useCartStore.getState();
    expect(items.map((i) => [i.variantId, i.quantity, i.maxQuantity])).toEqual([
      ["var-1", 1, 1],
      ["var-3", 1, 3],
    ]);
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

describe("foco al cerrar el carrito", () => {
  it("recuerda el elemento enfocado al abrir y lo entrega una sola vez", () => {
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();

    useCartStore.getState().open();
    expect(takeCartReturnFocus()).toBe(button);
    expect(takeCartReturnFocus()).toBeNull();
    button.remove();
  });

  it("no devuelve elementos que ya no están en la página", () => {
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    useCartStore.getState().setOpen(true);
    button.remove();
    expect(takeCartReturnFocus()).toBeNull();
  });
});
