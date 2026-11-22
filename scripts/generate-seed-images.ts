/**
 * Genera las imágenes provisionales del catálogo de demo en public/seed/.
 * Una imagen por color de cada producto (3:4), lisa en el tono de la prenda.
 * Uso: pnpm seed:images  (los SVG resultantes se versionan en git)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PRODUCTS, seedImagePath, type SeedColor } from "../prisma/seed-data";

const OUT_DIR = join(process.cwd(), "public");

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Placeholder liso en el color de la prenda (como los recuadros del diseño),
 * con un degradado muy suave para que no se vea plano.
 */
function svgFor(name: string, color: SeedColor): string {
  const label = escapeXml(`${name} — ${color.name}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="900" height="1200" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <rect width="900" height="1200" fill="${color.hex}"/>
  <rect width="900" height="1200" fill="url(#g)"/>
</svg>
`;
}

mkdirSync(join(OUT_DIR, "seed"), { recursive: true });
let count = 0;
for (const product of PRODUCTS) {
  product.colors.forEach((color, index) => {
    writeFileSync(
      join(OUT_DIR, seedImagePath(product.slug, index)),
      svgFor(product.name, color),
    );
    count++;
  });
}
console.log(`✓ ${count} imágenes generadas en public/seed/`);
