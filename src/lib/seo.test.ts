import { describe, expect, it } from "vitest";

import { parseCatalogFilters } from "@/lib/catalog/filters";

import {
  catalogIndexing,
  jsonLd,
  ogImageFromProductImage,
  openGraphBase,
  productJsonLd,
  truncate,
} from "./seo";

describe("catalogIndexing", () => {
  it.each([
    [{}, true, "/catalogo"],
    [{ categoria: "abrigos" }, true, "/catalogo?categoria=abrigos"],
    [
      { categoria: "abrigos", pagina: "2" },
      true,
      "/catalogo?categoria=abrigos&pagina=2",
    ],
    [
      { categoria: "abrigos", orden: "precio-asc" },
      true,
      "/catalogo?categoria=abrigos",
    ],
    [{ q: "lino" }, false, "/catalogo"],
    [
      { categoria: "punto", color: "Negro", pagina: "3" },
      false,
      "/catalogo?categoria=punto",
    ],
    [{ talla: "M" }, false, "/catalogo"],
    [{ precio_min: "500" }, false, "/catalogo"],
  ])("%j → index=%s, canonical=%s", (params, index, canonical) => {
    expect(catalogIndexing(parseCatalogFilters(params))).toEqual({
      index,
      canonical,
    });
  });
});

describe("ogImageFromProductImage", () => {
  it("añade la transformación 1200×630 a las fotos de Cloudinary", () => {
    expect(
      ogImageFromProductImage(
        "https://res.cloudinary.com/demo/image/upload/v12/atelier/products/p/x.webp",
      ),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v12/atelier/products/p/x.webp",
    );
  });

  it("los SVG locales del seed no sirven para redes sociales", () => {
    expect(ogImageFromProductImage("/seed/abrigo-1.svg")).toBeNull();
    expect(ogImageFromProductImage(null)).toBeNull();
  });
});

describe("truncate", () => {
  it("corta en un espacio y añade puntos suspensivos", () => {
    const text =
      "Abrigo largo de lana y cachemir con doble botonadura, solapas amplias y forro.";
    const short = truncate(text, 40);
    expect(short.length).toBeLessThanOrEqual(40);
    expect(short.endsWith("…")).toBe(true);
    expect(short).toBe("Abrigo largo de lana y cachemir con…");
  });

  it("no toca textos cortos", () => {
    expect(truncate("  Corto  ")).toBe("Corto");
  });
});

describe("JSON-LD", () => {
  it("precio en pesos como texto y disponibilidad", () => {
    const data = productJsonLd({
      url: "https://atelier.test/producto/x",
      name: "Pañuelo",
      description: "Seda",
      images: [],
      price: 59_900,
      inStock: false,
      category: "Accesorios",
    });
    expect(data.offers.price).toBe("599.00");
    expect(data.offers.priceCurrency).toBe("MXN");
    expect(data.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("no permite cerrar la etiqueta <script> desde los datos", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("openGraphBase", () => {
  it("siempre incluye locale, nombre del sitio e imagen (Next no fusiona openGraph)", () => {
    expect(openGraphBase()).toMatchObject({
      siteName: "ATELIER",
      locale: "es_MX",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    });
    expect(openGraphBase([{ url: "https://x/y.jpg" }]).images).toEqual([
      { url: "https://x/y.jpg" },
    ]);
  });
});
