import { compareSizes } from "./sizes";

/**
 * Matriz de variantes talla × color del admin. Lógica pura: dado lo que hay
 * en la BD y lo que el admin quiere, calcula los cambios sin tocar nada.
 *
 * Concurrencia con el checkout: cada celda lleva `expected`, el stock que el
 * admin vio al cargar la página. Solo se escriben las celdas que el admin
 * cambió, y solo si la BD sigue teniendo `expected` (si una venta reservó
 * stock entretanto, es un conflicto y no se sobrescribe).
 */

export type MatrixColor = { name: string; hex: string };

export type MatrixCell = {
  color: string;
  size: string;
  stock: number;
  /** Stock al cargar la página; null si la celda no existía. */
  expected: number | null;
};

export type MatrixInput = {
  colors: MatrixColor[];
  sizes: string[];
  cells: MatrixCell[];
};

export type ExistingVariant = {
  id: string;
  color: string;
  colorHex: string | null;
  size: string;
  stock: number;
  /** Tiene líneas de pedido: no se puede borrar (FK) → poner stock a 0. */
  hasOrders: boolean;
};

export type VariantKey = { color: string; size: string };

export type VariantUpdate = {
  id: string;
  colorHex?: string;
  /** Escritura condicional: solo si la BD sigue en `expected` (o sin condición si es null). */
  stock?: { value: number; expected: number | null };
};

export type VariantPlan = {
  create: { color: string; colorHex: string; size: string; stock: number }[];
  update: VariantUpdate[];
  remove: string[];
  /** Combinaciones que el admin quitó pero tienen pedidos. */
  blocked: VariantKey[];
  /** Celdas cambiadas cuyo stock ya no coincide con el que vio el admin. */
  conflicts: (VariantKey & { current: number })[];
};

export const cellKey = (color: string, size: string) => `${color}\u0000${size}`;

export function planVariantChanges(
  existing: ExistingVariant[],
  input: MatrixInput,
): VariantPlan {
  const plan: VariantPlan = {
    create: [],
    update: [],
    remove: [],
    blocked: [],
    conflicts: [],
  };

  const cells = new Map(input.cells.map((c) => [cellKey(c.color, c.size), c]));
  const current = new Map(existing.map((v) => [cellKey(v.color, v.size), v]));
  const desired = new Set<string>();

  for (const color of input.colors) {
    for (const size of input.sizes) {
      const key = cellKey(color.name, size);
      desired.add(key);
      const cell = cells.get(key);
      const stock = cell?.stock ?? 0;
      const expected = cell?.expected ?? null;
      const variant = current.get(key);

      if (!variant) {
        plan.create.push({
          color: color.name,
          colorHex: color.hex,
          size,
          stock,
        });
        continue;
      }

      const update: VariantUpdate = { id: variant.id };
      if (variant.colorHex?.toLowerCase() !== color.hex.toLowerCase()) {
        update.colorHex = color.hex;
      }
      const changedByAdmin = expected === null || stock !== expected;
      if (changedByAdmin && stock !== variant.stock) {
        if (expected !== null && expected !== variant.stock) {
          plan.conflicts.push({
            color: color.name,
            size,
            current: variant.stock,
          });
        } else {
          update.stock = { value: stock, expected };
        }
      }
      if (update.colorHex !== undefined || update.stock !== undefined) {
        plan.update.push(update);
      }
    }
  }

  for (const [key, variant] of current) {
    if (desired.has(key)) continue;
    if (variant.hasOrders) {
      plan.blocked.push({ color: variant.color, size: variant.size });
    } else {
      plan.remove.push(variant.id);
    }
  }

  return plan;
}

/** Colores en orden de aparición y tallas en orden canónico, para la UI. */
export function matrixFromVariants(
  variants: Omit<ExistingVariant, "id" | "hasOrders">[],
): MatrixInput {
  const colors = new Map<string, MatrixColor>();
  const sizes = new Set<string>();
  for (const v of variants) {
    if (!colors.has(v.color)) {
      colors.set(v.color, { name: v.color, hex: v.colorHex ?? "#000000" });
    }
    sizes.add(v.size);
  }
  return {
    colors: [...colors.values()],
    sizes: [...sizes].sort(compareSizes),
    cells: variants.map((v) => ({
      color: v.color,
      size: v.size,
      stock: v.stock,
      expected: v.stock,
    })),
  };
}
