/**
 * Genera las imágenes provisionales del catálogo de demo en public/seed/.
 * Una imagen por color de cada producto (3:4), en el tono de la prenda.
 * Uso: pnpm seed:images  (los SVG resultantes se versionan en git)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PRODUCTS, seedImagePath, type SeedColor } from "../prisma/seed-data";

const OUT_DIR = join(process.cwd(), "public");

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function svgFor(name: string, color: SeedColor): string {
  const dark = luminance(color.hex) < 0.18;
  const ink = dark ? "#F7F5F0" : "#1C1C1C";
  const soft = dark ? "rgba(247,245,240,0.16)" : "rgba(28,28,28,0.10)";
  const title = escapeXml(name);
  const colorName = escapeXml(color.name);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="900" height="1200" role="img" aria-label="${title} — ${colorName}">
  <rect width="900" height="1200" fill="${color.hex}"/>
  <rect x="60" y="60" width="780" height="1080" fill="none" stroke="${soft}" stroke-width="2"/>
  <circle cx="450" cy="520" r="230" fill="${soft}"/>
  <text x="450" y="140" text-anchor="middle" fill="${ink}" font-family="Helvetica, Arial, sans-serif" font-size="28" letter-spacing="14">ATELIER</text>
  <text x="450" y="1000" text-anchor="middle" fill="${ink}" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="600">${title}</text>
  <text x="450" y="1056" text-anchor="middle" fill="${ink}" fill-opacity="0.75" font-family="Helvetica, Arial, sans-serif" font-size="28" letter-spacing="4">${colorName.toUpperCase()}</text>
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
