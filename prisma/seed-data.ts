/**
 * Catálogo de demostración de ATELIER. Precios en CENTAVOS (MXN).
 * El stock se calcula de forma determinista (ver `stockFor`) para que el seed
 * sea reproducible e incluya casos de "agotado" y "stock bajo".
 */

export type SeedColor = { name: string; hex: string; code: string };

export const COLORS = {
  negro: { name: "Negro", hex: "#1C1C1C", code: "NEG" },
  crudo: { name: "Crudo", hex: "#EDE5D6", code: "CRU" },
  arena: { name: "Arena", hex: "#C6B79E", code: "ARE" },
  camel: { name: "Camel", hex: "#B98B5E", code: "CAM" },
  gris: { name: "Gris jaspeado", hex: "#9A9A97", code: "GRI" },
  marino: { name: "Azul marino", hex: "#1F2A44", code: "MAR" },
  oliva: { name: "Verde oliva", hex: "#6B6B3A", code: "OLI" },
  blanco: { name: "Blanco", hex: "#F7F5F0", code: "BLA" },
  chocolate: { name: "Chocolate", hex: "#4A3426", code: "CHO" },
  denim: { name: "Denim", hex: "#4D6A8C", code: "DEN" },
  plata: { name: "Plata", hex: "#C9CACC", code: "PLA" },
  oro: { name: "Baño de oro", hex: "#CBA35C", code: "ORO" },
} as const satisfies Record<string, SeedColor>;

export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"] as const;
export const ONE_SIZE = ["Única"] as const;
export const RING_SIZES = ["6", "7", "8"] as const;

/** En el orden en que se muestran en la navegación. */
export const CATEGORIES = [
  { slug: "mujer", name: "Mujer", position: 0 },
  { slug: "hombre", name: "Hombre", position: 1 },
  { slug: "gorras", name: "Gorras", position: 2 },
  { slug: "joyeria", name: "Joyería", position: 3 },
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

/** El orden define "Novedades": el primero es el más reciente. */
export const PRODUCTS: readonly SeedProduct[] = [
  {
    code: "MUJ01",
    slug: "camiseta-oversize-lino",
    name: "Camiseta oversize de lino",
    description:
      "Corte relajado en lino lavado, cuello redondo y hombros caídos. Una pieza base que combina con todo.",
    category: "mujer",
    basePrice: 89000,
    colors: [COLORS.crudo, COLORS.negro, COLORS.arena],
    sizes: APPAREL_SIZES,
  },
  {
    code: "HOM01",
    slug: "sudadera-crewneck",
    name: "Sudadera crewneck",
    description:
      "Felpa de algodón orgánico de 400 g, cuello redondo acanalado y puños con elástico. Interior perchado.",
    category: "hombre",
    basePrice: 129000,
    colors: [COLORS.gris, COLORS.negro, COLORS.oliva],
    sizes: APPAREL_SIZES,
  },
  {
    code: "GOR01",
    slug: "gorra-dad-hat-negra",
    name: "Gorra dad hat negra",
    description:
      "Gorra de sarga de algodón lavado, visera curva y cierre ajustable con hebilla metálica.",
    category: "gorras",
    basePrice: 59000,
    colors: [COLORS.negro],
    sizes: ONE_SIZE,
  },
  {
    code: "JOY01",
    slug: "cadena-eslabon-plata",
    name: "Cadena eslabón plata 925",
    description:
      "Cadena de eslabón cuadrado en plata esterlina 925, 50 cm de largo y broche de langosta.",
    category: "joyeria",
    basePrice: 119000,
    colors: [COLORS.plata],
    sizes: ONE_SIZE,
  },
  {
    code: "MUJ02",
    slug: "vestido-midi-plisado",
    name: "Vestido midi plisado",
    description:
      "Vestido midi de crepé con falda plisada, cintura ajustada y manga tres cuartos.",
    category: "mujer",
    basePrice: 179000,
    colors: [COLORS.negro, COLORS.oliva],
    sizes: APPAREL_SIZES,
  },
  {
    code: "MUJ03",
    slug: "blazer-estructurado",
    name: "Blazer estructurado",
    description:
      "Blazer de lana fría con hombros marcados, botonadura sencilla y forro de viscosa.",
    category: "mujer",
    basePrice: 249000,
    colors: [COLORS.negro, COLORS.camel],
    sizes: APPAREL_SIZES,
  },
  {
    code: "MUJ04",
    slug: "pantalon-palazzo",
    name: "Pantalón palazzo",
    description:
      "Pantalón de pierna amplia y tiro alto en crepé fluido, con pinzas y cierre lateral invisible.",
    category: "mujer",
    basePrice: 135000,
    colors: [COLORS.crudo, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "MUJ05",
    slug: "sueter-punto-fino",
    name: "Suéter de punto fino",
    description:
      "Suéter de lana merino extrafina, cuello redondo y acabado acanalado en puños y bajo.",
    category: "mujer",
    basePrice: 149000,
    colors: [COLORS.arena, COLORS.marino],
    sizes: APPAREL_SIZES,
  },
  {
    code: "MUJ06",
    slug: "falda-satinada",
    name: "Falda satinada",
    description:
      "Falda midi al bies en satén, cintura elástica oculta y caída fluida.",
    category: "mujer",
    basePrice: 119000,
    colors: [COLORS.chocolate, COLORS.crudo],
    sizes: APPAREL_SIZES,
  },
  {
    code: "MUJ07",
    slug: "top-basico-algodon",
    name: "Top básico de algodón",
    description:
      "Top de tirantes en punto de algodón pima con escote recto. Ajuste ceñido.",
    category: "mujer",
    basePrice: 59000,
    colors: [COLORS.blanco, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "MUJ08",
    slug: "abrigo-lana",
    name: "Abrigo de lana",
    description:
      "Abrigo largo de lana y cachemir con doble botonadura y solapas amplias. Corte relajado para llevar sobre punto.",
    category: "mujer",
    basePrice: 329000,
    colors: [COLORS.camel, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "MUJ09",
    slug: "camisa-popelina-blanca",
    name: "Camisa popelina blanca",
    description:
      "Camisa amplia de popelina de algodón, cuello clásico y puños con dos botones.",
    category: "mujer",
    basePrice: 105000,
    colors: [COLORS.blanco],
    sizes: APPAREL_SIZES,
  },
  {
    code: "MUJ10",
    slug: "jeans-rectos-tiro-alto",
    name: "Jeans rectos tiro alto",
    description:
      "Denim rígido 100 % algodón, pierna recta y largo al tobillo. Cinco bolsillos.",
    category: "mujer",
    basePrice: 139000,
    colors: [COLORS.denim],
    sizes: APPAREL_SIZES,
  },
  {
    code: "MUJ11",
    slug: "cardigan-largo",
    name: "Cardigan largo",
    description:
      "Cárdigan largo de punto grueso con bolsillos de parche y botones de corozo. Edición limitada.",
    category: "mujer",
    basePrice: 169000,
    colors: [COLORS.chocolate],
    sizes: APPAREL_SIZES,
    soldOut: true,
  },
  {
    code: "MUJ12",
    slug: "short-lino",
    name: "Short de lino",
    description:
      "Short de lino con cintura elástica, cordón y bolsillos laterales.",
    category: "mujer",
    basePrice: 79000,
    colors: [COLORS.crudo, COLORS.oliva],
    sizes: APPAREL_SIZES,
  },
  {
    code: "HOM02",
    slug: "camiseta-algodon-pesado",
    name: "Camiseta de algodón pesado",
    description:
      "Camiseta de punto de algodón de 240 g, cuello redondo reforzado y corte recto.",
    category: "hombre",
    basePrice: 59000,
    colors: [COLORS.blanco, COLORS.negro, COLORS.gris],
    sizes: APPAREL_SIZES,
  },
  {
    code: "HOM03",
    slug: "camisa-oxford",
    name: "Camisa oxford",
    description:
      "Camisa de algodón oxford con cuello abotonado y bolsillo en el pecho.",
    category: "hombre",
    basePrice: 99000,
    colors: [COLORS.blanco, COLORS.denim],
    sizes: APPAREL_SIZES,
  },
  {
    code: "HOM04",
    slug: "pantalon-chino",
    name: "Pantalón chino",
    description:
      "Chino de sarga de algodón con un toque de elastano, pierna recta y bajo sin vuelta.",
    category: "hombre",
    basePrice: 115000,
    colors: [COLORS.arena, COLORS.marino],
    sizes: APPAREL_SIZES,
  },
  {
    code: "HOM05",
    slug: "chamarra-bomber",
    name: "Chamarra bomber",
    description:
      "Bomber de nylon reciclado con relleno ligero, puños acanalados y bolsillo interior.",
    category: "hombre",
    basePrice: 219000,
    colors: [COLORS.oliva, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "HOM06",
    slug: "sueter-merino",
    name: "Suéter de lana merino",
    description:
      "Suéter de cuello redondo en lana merino de galga fina. Ligero y transpirable.",
    category: "hombre",
    basePrice: 159000,
    colors: [COLORS.marino, COLORS.gris],
    sizes: APPAREL_SIZES,
  },
  {
    code: "HOM07",
    slug: "jeans-slim",
    name: "Jeans slim",
    description:
      "Denim con elastano, pierna entallada y lavado medio. Cinco bolsillos.",
    category: "hombre",
    basePrice: 135000,
    colors: [COLORS.denim, COLORS.negro],
    sizes: APPAREL_SIZES,
  },
  {
    code: "HOM08",
    slug: "sobrecamisa-pana",
    name: "Sobrecamisa de pana",
    description:
      "Sobrecamisa de pana de algodón con bolsillos de parche. Se lleva abierta o como chamarra ligera.",
    category: "hombre",
    basePrice: 149000,
    colors: [COLORS.camel, COLORS.chocolate],
    sizes: APPAREL_SIZES,
  },
  {
    code: "GOR02",
    slug: "gorra-cinco-paneles",
    name: "Gorra cinco paneles",
    description:
      "Gorra de nylon técnico de cinco paneles, visera plana y correa trasera ajustable.",
    category: "gorras",
    basePrice: 64000,
    colors: [COLORS.arena, COLORS.oliva],
    sizes: ONE_SIZE,
  },
  {
    code: "GOR03",
    slug: "gorro-beanie-punto",
    name: "Gorro beanie de punto",
    description:
      "Gorro de punto acanalado en lana merino con dobladillo ancho.",
    category: "gorras",
    basePrice: 49000,
    colors: [COLORS.gris, COLORS.negro, COLORS.crudo],
    sizes: ONE_SIZE,
  },
  {
    code: "GOR04",
    slug: "gorra-lana",
    name: "Gorra de lana",
    description:
      "Gorra de paño de lana con visera rígida y cierre de piel ajustable.",
    category: "gorras",
    basePrice: 69000,
    colors: [COLORS.camel, COLORS.marino],
    sizes: ONE_SIZE,
  },
  {
    code: "JOY02",
    slug: "anillo-liso-plata",
    name: "Anillo liso plata 925",
    description:
      "Anillo de plata esterlina 925 de banda lisa de 4 mm con acabado pulido.",
    category: "joyeria",
    basePrice: 69000,
    colors: [COLORS.plata, COLORS.oro],
    sizes: RING_SIZES,
  },
  {
    code: "JOY03",
    slug: "arracadas-plata",
    name: "Arracadas de plata",
    description:
      "Arracadas tubulares de plata 925 de 25 mm con cierre a presión.",
    category: "joyeria",
    basePrice: 79000,
    colors: [COLORS.plata, COLORS.oro],
    sizes: ONE_SIZE,
  },
  {
    code: "JOY04",
    slug: "pulsera-cadena-fina",
    name: "Pulsera de cadena fina",
    description:
      "Pulsera de cadena forzada en plata 925, ajustable de 16 a 19 cm.",
    category: "joyeria",
    basePrice: 59000,
    colors: [COLORS.plata],
    sizes: ONE_SIZE,
  },
  {
    code: "JOY05",
    slug: "collar-dije-circulo",
    name: "Collar con dije de círculo",
    description:
      "Collar de plata 925 con dije de círculo martillado y cadena de 45 cm.",
    category: "joyeria",
    basePrice: 89000,
    colors: [COLORS.plata, COLORS.oro],
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
