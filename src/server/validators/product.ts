import { z } from "zod";

import {
  MAX_PRODUCT_IMAGES,
  UPLOAD_FORMATS,
} from "@/lib/catalog/product-images";
import { SIZE_ORDER } from "@/lib/catalog/sizes";
import { SLUG_MAX, SLUG_PATTERN, slugify } from "@/lib/catalog/slug";
import { cellKey } from "@/lib/catalog/variant-matrix";
import { parsePriceToCents } from "@/lib/money";

/**
 * Validación (Zod) de todas las entradas del admin de catálogo. Las Server
 * Actions reciben datos del navegador: nada de aquí se da por bueno sin pasar
 * por estos esquemas.
 */

/** 1 000 000 MXN: tope de cordura para evitar errores de tecleo. */
export const PRICE_MAX_CENTS = 100_000_000;
export const STOCK_MAX = 9_999;
export const MAX_COLORS = 12;

export const idSchema = z.string().trim().min(1).max(64);

const priceSchema = z
  .string()
  .trim()
  .min(1, "Introduce el precio.")
  .transform((value, ctx) => {
    const cents = parsePriceToCents(value);
    if (cents === null) {
      ctx.addIssue({
        code: "custom",
        message: "Precio no válido (p. ej. 1299 o 1,299.50).",
      });
      return z.NEVER;
    }
    return cents;
  })
  .refine((cents) => cents > 0, "El precio debe ser mayor que 0.")
  .refine(
    (cents) => cents <= PRICE_MAX_CENTS,
    "El precio no puede superar $1,000,000.",
  );

export const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(120, "Máximo 120 caracteres."),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(SLUG_MAX, `Máximo ${SLUG_MAX} caracteres.`),
    description: z
      .string()
      .trim()
      .min(10, "La descripción debe tener al menos 10 caracteres.")
      .max(2000, "Máximo 2000 caracteres."),
    price: priceSchema,
    categoryId: z.string().trim().min(1, "Elige una categoría."),
    // Opcional: los productos con el mismo modelo son el mismo artículo en
    // otro color (la ficha enlaza sus colores).
    model: z
      .string()
      .trim()
      .max(80, "Máximo 80 caracteres.")
      .transform((value) => value || null),
    active: z.preprocess(
      (value) => value === "on" || value === "true",
      z.boolean(),
    ),
  })
  // Slug vacío → se deriva del nombre.
  .transform((data) => ({ ...data, slug: data.slug || slugify(data.name) }))
  .refine((data) => SLUG_PATTERN.test(data.slug), {
    message: "Usa solo minúsculas, números y guiones (p. ej. abrigo-lana).",
    path: ["slug"],
  });

export type ProductFormData = z.infer<typeof productFormSchema>;

export function parseProductForm(formData: FormData) {
  return productFormSchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    price: formData.get("price") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    model: formData.get("model") ?? "",
    active: formData.get("active"),
  });
}

const sizeSchema = z.enum(SIZE_ORDER);

export const variantMatrixSchema = z
  .object({
    colors: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, "Cada color necesita un nombre.")
            .max(40, "Nombre de color demasiado largo."),
          hex: z
            .string()
            .regex(/^#[0-9a-f]{6}$/i, "Color no válido (formato #RRGGBB)."),
        }),
      )
      .min(1, "Añade al menos un color.")
      .max(MAX_COLORS, `Máximo ${MAX_COLORS} colores.`),
    sizes: z.array(sizeSchema).min(1, "Elige al menos una talla."),
    cells: z
      .array(
        z.object({
          color: z.string().trim(),
          size: sizeSchema,
          stock: z
            .number("El stock debe ser un número.")
            .int("El stock debe ser un número entero.")
            .min(0, "El stock no puede ser negativo.")
            .max(STOCK_MAX, `Máximo ${STOCK_MAX} unidades por variante.`),
          expected: z.number().int().min(0).nullable(),
        }),
      )
      .max(MAX_COLORS * SIZE_ORDER.length),
  })
  .superRefine((data, ctx) => {
    const names = data.colors.map((c) => c.name.toLocaleLowerCase("es"));
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: "custom",
        path: ["colors"],
        message: "Hay colores repetidos.",
      });
    }
    if (new Set(data.sizes).size !== data.sizes.length) {
      ctx.addIssue({
        code: "custom",
        path: ["sizes"],
        message: "Hay tallas repetidas.",
      });
    }
    if (data.sizes.includes("Única") && data.sizes.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["sizes"],
        message: "La talla «Única» no se combina con otras tallas.",
      });
    }
    const valid = new Set(
      data.colors.flatMap((c) => data.sizes.map((s) => cellKey(c.name, s))),
    );
    if (data.cells.some((cell) => !valid.has(cellKey(cell.color, cell.size)))) {
      ctx.addIssue({
        code: "custom",
        path: ["cells"],
        message: "Hay celdas que no corresponden a ningún color o talla.",
      });
    }
  });

export type VariantMatrixData = z.infer<typeof variantMatrixSchema>;

export const uploadedImagesSchema = z
  .array(
    z.object({
      publicId: z.string().min(1).max(255),
      version: z.number().int().positive(),
      signature: z.string().regex(/^[a-f0-9]{40,64}$/i),
      format: z.enum(UPLOAD_FORMATS),
    }),
  )
  .min(1)
  .max(MAX_PRODUCT_IMAGES);

export type UploadedImage = z.infer<typeof uploadedImagesSchema>[number];

/** Nombre de un color de variante (al renombrarlo). */
export const colorNameSchema = z
  .string()
  .trim()
  .min(1, "Escribe el nombre del color.")
  .max(40, "Nombre de color demasiado largo.");

/** Color al que se asigna una foto; null = todos los colores. */
export const imageColorSchema = z.string().trim().min(1).max(40).nullable();

export const imageMoveSchema = z.object({
  imageId: idSchema,
  direction: z.enum(["up", "down"]),
});
