/**
 * Catálogo de demostración de ATELIER. Precios en CENTAVOS (MXN).
 * El stock se calcula de forma determinista (ver `stockFor`) para que el seed
 * sea reproducible e incluya casos de "agotado" y "stock bajo".
 */

export type SeedColor = { name: string; hex: string; code: string };

export const COLORS = {
  negro: { name: "Negro", hex: "#1C1C1C", code: "NEG" },
  crudo: { name: "Crudo", hex: "#EDE6D6", code: "CRU" },
  camel: { name: "Camel", hex: "#B98B5E", code: "CAM" },
  gris: { name: "Gris jaspeado", hex: "#9A9A97", code: "GRI" },
  marino: { name: "Azul marino", hex: "#1F2A44", code: "MAR" },
  oliva: { name: "Verde oliva", hex: "#6B6B3A", code: "OLI" },
  blanco: { name: "Blanco", hex: "#F7F5F0", code: "BLA" },
  chocolate: { name: "Chocolate", hex: "#4A3426", code: "CHO" },
  arena: { name: "Arena", hex: "#D8C7A9", code: "ARE" },
  burdeos: { name: "Burdeos", hex: "#5E1F2A", code: "BUR" },
  denim: { name: "Denim", hex: "#4D6A8C", code: "DEN" },
  celeste: { name: "Celeste", hex: "#BFD1E5", code: "CEL" },
} as const satisfies Record<string, SeedColor>;

export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"] as const;
export const ONE_SIZE = ["Única"] as const;

export const CATEGORIES = [
  { slug: "abrigos", name: "Abrigos y chaquetas" },
  { slug: "camisas", name: "Camisas y blusas" },
  { slug: "punto", name: "Punto" },
  { slug: "pantalones", name: "Pantalones" },
  { slug: "vestidos", name: "Vestidos" },
  { slug: "accesorios", name: "Accesorios" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export type SeedProduct = {
  code: string; // prefijo de SKU
  slug: string;
  name: string;
  description: string;
  category: CategorySlug;
  basePrice: number; // centavos
  colors: readonly SeedColor[];
  sizes: readonly string[];
  /** Fuerza todo el producto a stock 0 (estado "agotado"). */
  soldOut?: boolean;
};

export const PRODUCTS: readonly SeedProduct[] = [
  {
    code: "ABR01",
    slug: "abrigo-lana-cruzado",
    name: "Abrigo de lana cruzado",
    description:
      "Abrigo largo de lana y cachemir con doble botonadura, solapas amplias y forro de viscosa. Corte relajado para llevar sobre punto.",
    category: "abrigos",
    basePrice: 489900,
    colors: [COLORS.camel, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "ABR02",
    slug: "trench-algodon",
    name: "Trench de algodón",
    description:
      "Gabardina clásica de algodón técnico repelente al agua, con cinturón, hombreras y vuelo trasero.",
    category: "abrigos",
    basePrice: 359900,
    colors: [COLORS.arena, COLORS.marino],
    sizes: APPAREL_SIZES,
  },
  {
    code: "ABR03",
    slug: "chaqueta-ante",
    name: "Chaqueta de ante",
    description:
      "Chaqueta corta de ante de cabra con cremallera metálica y bolsillos de parche. Edición limitada.",
    category: "abrigos",
    basePrice: 429900,
    colors: [COLORS.chocolate],
    sizes: APPAREL_SIZES,
    soldOut: true,
  },
  {
    code: "CAM01",
    slug: "camisa-popelin-oversize",
    name: "Camisa de popelín oversize",
    description:
      "Camisa amplia de popelín de algodón orgánico con cuello clásico, hombro caído y puños con dos botones.",
    category: "camisas",
    basePrice: 109900,
    colors: [COLORS.blanco, COLORS.celeste],
    sizes: APPAREL_SIZES,
  },
  {
    code: "CAM02",
    slug: "blusa-seda-lavada",
    name: "Blusa de seda lavada",
    description:
      "Blusa fluida de seda lavada con tacto aterciopelado, escote en pico y botones de nácar.",
    category: "camisas",
    basePrice: 169900,
    colors: [COLORS.crudo, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "CAM03",
    slug: "camisa-lino",
    name: "Camisa de lino",
    description:
      "Camisa de lino europeo prelavado, ligera y transpirable, con bolsillo en el pecho.",
    category: "camisas",
    basePrice: 129900,
    colors: [COLORS.crudo, COLORS.oliva],
    sizes: APPAREL_SIZES,
  },
  {
    code: "PUN01",
    slug: "jersey-cachemir-cuello-redondo",
    name: "Jersey de cachemir",
    description:
      "Jersey de cuello redondo en cachemir mongol de 2 cabos. Suave, cálido y de peso medio.",
    category: "punto",
    basePrice: 249900,
    colors: [COLORS.gris, COLORS.camel, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "PUN02",
    slug: "cardigan-punto-grueso",
    name: "Cárdigan de punto grueso",
    description:
      "Cárdigan de lana merino en punto inglés con botones de madera y bolsillos laterales.",
    category: "punto",
    basePrice: 189900,
    colors: [COLORS.crudo, COLORS.chocolate],
    sizes: APPAREL_SIZES,
  },
  {
    code: "PAN01",
    slug: "pantalon-sastre-pinzas",
    name: "Pantalón sastre de pinzas",
    description:
      "Pantalón de lana fría con pinzas delanteras, pierna recta y raya marcada. Cintura con trabillas.",
    category: "pantalones",
    basePrice: 149900,
    colors: [COLORS.negro, COLORS.gris],
    sizes: APPAREL_SIZES,
  },
  {
    code: "PAN02",
    slug: "jean-recto-tiro-alto",
    name: "Jean recto de tiro alto",
    description:
      "Vaquero de algodón 100 % rígido, tiro alto y pierna recta hasta el tobillo.",
    category: "pantalones",
    basePrice: 119900,
    colors: [COLORS.denim, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "PAN03",
    slug: "pantalon-ancho-lino",
    name: "Pantalón ancho de lino",
    description:
      "Pantalón de pierna ancha en lino con cintura elástica posterior y caída fluida.",
    category: "pantalones",
    basePrice: 129900,
    colors: [COLORS.arena, COLORS.blanco],
    sizes: APPAREL_SIZES,
  },
  {
    code: "VES01",
    slug: "vestido-midi-saten",
    name: "Vestido midi de satén",
    description:
      "Vestido lencero de satén al bies con tirantes finos ajustables y largo a media pierna.",
    category: "vestidos",
    basePrice: 219900,
    colors: [COLORS.burdeos, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "VES02",
    slug: "vestido-camisero-algodon",
    name: "Vestido camisero de algodón",
    description:
      "Vestido camisero de algodón con cinturón del mismo tejido, mangas remangables y falda con vuelo.",
    category: "vestidos",
    basePrice: 159900,
    colors: [COLORS.marino, COLORS.crudo],
    sizes: APPAREL_SIZES,
  },
  {
    code: "ACC01",
    slug: "bolso-tote-piel",
    name: "Bolso tote de piel",
    description:
      "Bolso tote de piel de becerro con curtido vegetal, bolsillo interior con cremallera y asas reforzadas.",
    category: "accesorios",
    basePrice: 279900,
    colors: [COLORS.negro, COLORS.camel],
    sizes: ONE_SIZE,
  },
  {
    code: "ACC02",
    slug: "cinturon-piel",
    name: "Cinturón de piel",
    description:
      "Cinturón de piel lisa de 3 cm con hebilla de latón cepillado.",
    category: "accesorios",
    basePrice: 69900,
    colors: [COLORS.negro, COLORS.chocolate],
    sizes: ONE_SIZE,
  },
  {
    code: "ACC03",
    slug: "panuelo-seda-estampado",
    name: "Pañuelo de seda estampado",
    description:
      "Pañuelo cuadrado de sarga de seda con estampado geométrico y bordes enrollados a mano.",
    category: "accesorios",
    basePrice: 59900,
    colors: [COLORS.burdeos, COLORS.marino],
    sizes: ONE_SIZE,
  },
];

export function skuFor(
  product: SeedProduct,
  color: SeedColor,
  size: string,
): string {
  const sizeCode = size === "Única" ? "U" : size;
  return `ATL-${product.code}-${color.code}-${sizeCode}`;
}

/**
 * Stock determinista a partir del SKU (0–12). Aproximadamente 1 de cada 8
 * variantes queda en 0 y otras en 1–3 (stock bajo) para ejercitar la UI.
 */
export function stockFor(product: SeedProduct, sku: string): number {
  if (product.soldOut) return 0;
  let hash = 0;
  for (const char of sku) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const bucket = hash % 8;
  if (bucket === 0) return 0;
  if (bucket === 1) return 1 + (hash % 3);
  return 4 + (hash % 9);
}

/** Ruta pública de las imágenes provisionales (ver scripts/generate-seed-images.ts). */
export function seedImagePath(slug: string, index: number): string {
  return `/seed/${slug}-${index + 1}.svg`;
}

/** publicId con prefijo `seed/`: no son recursos de Cloudinary, no se borran allí. */
export function seedImagePublicId(slug: string, index: number): string {
  return `seed/${slug}-${index + 1}`;
}
