import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { MAX_QUANTITY_PER_ITEM } from "@/lib/catalog/variants";

/**
 * Carrito del cliente (Zustand + localStorage).
 *
 * IMPORTANTE: `unitPrice` es solo para mostrar. Al crear el checkout el
 * servidor recibe únicamente { variantId, quantity } y relee precios y stock
 * de la base de datos.
 */
export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  color: string;
  size: string;
  image: string | null;
  /** Centavos, solo informativo. */
  unitPrice: number;
  quantity: number;
  /** Límite conocido al añadir (stock y tope por pedido). */
  maxQuantity: number;
};

export type AddResult = "added" | "capped" | "unavailable";

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  hasHydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => AddResult;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  /** Ajusta cantidades al stock real que informó el servidor (409). */
  limitToStock: (limits: { variantId: string; available: number }[]) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
};

function clamp(quantity: number, max: number): number {
  const limit = Math.min(max, MAX_QUANTITY_PER_ITEM);
  return Math.max(0, Math.min(Math.floor(quantity), limit));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hasHydrated: false,

      addItem: (item, quantity = 1) => {
        if (item.maxQuantity <= 0 || quantity <= 0) return "unavailable";
        const existing = get().items.find(
          (i) => i.variantId === item.variantId,
        );
        const wanted = (existing?.quantity ?? 0) + quantity;
        const next = clamp(wanted, item.maxQuantity);
        if (existing && next === existing.quantity) return "capped";

        set((state) => ({
          items: existing
            ? state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, ...item, quantity: next }
                  : i,
              )
            : [...state.items, { ...item, quantity: next }],
        }));
        return next < wanted ? "capped" : "added";
      },

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.variantId === variantId
                ? { ...i, quantity: clamp(quantity, i.maxQuantity) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      limitToStock: (limits) => {
        const available = new Map(
          limits.map((l) => [l.variantId, Math.max(0, l.available)]),
        );
        set((state) => ({
          items: state.items
            .map((i) => {
              const max = available.get(i.variantId);
              if (max === undefined) return i;
              return {
                ...i,
                maxQuantity: max,
                quantity: clamp(i.quantity, max),
              };
            })
            .filter((i) => i.quantity > 0),
        }));
      },

      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setOpen: (isOpen) => set({ isOpen }),
    }),
    {
      name: "atelier-cart",
      version: 1,
      // `window.localStorage` lanza en el servidor y persist lo trata como
      // "sin almacenamiento" (Node 26 expone un `localStorage` global experimental).
      storage: createJSONStorage(() => window.localStorage),
      // Solo los artículos se persisten; el estado de la UI no.
      partialize: (state) => ({ items: state.items }),
      // Se rehidrata manualmente tras montar (ver CartHydrator) para que el
      // HTML del servidor coincida con el primer render del cliente.
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useCartStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
