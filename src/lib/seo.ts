import { type CatalogFilters, catalogHref } from "@/lib/catalog/filters";

/** Datos de marca para metadatos, Open Graph y datos estructurados. */
export const SITE = {
  name: "ATELIER",
  title: "ATELIER — Moda contemporánea",
  description:
    "Moda contemporánea con siluetas esenciales y materiales nobles: abrigos, camisas, punto, pantalones, vestidos y accesorios. Envío gratis desde $1,500 MXN.",
  locale: "es_MX",
} as const;

/** Imagen OG por defecto (src/app/opengraph-image.tsx). */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: SITE.title,
};

/**
 * Campos comunes de Open Graph. Next combina los metadatos de forma
 * superficial: si una página define `openGraph`, sustituye por completo al del
 * layout raíz. Por eso cada página que lo personaliza parte de este objeto.
 */
export function openGraphBase(
  images: { url: string; width?: number; height?: number; alt?: string }[] = [
    DEFAULT_OG_IMAGE,
  ],
) {
  return {
    type: "website" as const,
    siteName: SITE.name,
    locale: SITE.locale,
    images,
  };
}

/** Recorta en el último espacio antes de `max` y añade "…". */
export function truncate(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

/**
 * Indexación del catálogo: solo se indexan el catálogo general y las
 * categorías (con su paginación). Búsquedas y filtros de color, talla o precio
 * generan combinaciones casi duplicadas: `noindex, follow` y canonical a la
 * categoría. El orden nunca forma parte de la URL canónica.
 */
export function catalogIndexing(filters: CatalogFilters): {
  index: boolean;
  canonical: string;
} {
  const filtered =
    Boolean(filters.q) ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;
  return {
    index: !filtered,
    canonical: catalogHref({
      category: filters.category,
      page: filtered ? 1 : filters.page,
    }),
  };
}

/**
 * Imagen para Open Graph (1200×630, JPG) a partir de una foto de Cloudinary.
 * Las redes no aceptan SVG: los placeholders del seed devuelven null y se usa
 * la imagen OG por defecto del sitio.
 */
export function ogImageFromProductImage(
  url: string | null | undefined,
): string | null {
  if (!url?.startsWith("https://res.cloudinary.com/")) return null;
  return url.replace(
    "/image/upload/",
    "/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/",
  );
}

/** JSON-LD seguro dentro de <script>: escapa "<" para impedir cerrar la etiqueta. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function productJsonLd(input: {
  url: string;
  name: string;
  description: string;
  images: string[];
  /** Centavos */
  price: number;
  inStock: boolean;
  category: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.images,
    category: input.category,
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: "MXN",
      // Schema.org espera el precio en unidades, como texto decimal.
      price: `${Math.floor(input.price / 100)}.${String(input.price % 100).padStart(2, "0")}`,
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}
