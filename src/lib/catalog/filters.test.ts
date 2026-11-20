import { describe, expect, it } from "vitest";

import {
  catalogHref,
  hasActiveFilters,
  parseCatalogFilters,
  serializeCatalogFilters,
  toggleValue,
  withFilters,
} from "./filters";

describe("parseCatalogFilters", () => {
  it("devuelve valores por defecto con la URL vacía", () => {
    expect(parseCatalogFilters({})).toEqual({
      category: undefined,
      q: undefined,
      colors: [],
      sizes: [],
      minPrice: undefined,
      maxPrice: undefined,
      sort: "novedades",
      page: 1,
    });
  });

  it("lee todos los filtros y convierte pesos a centavos", () => {
    const filters = parseCatalogFilters({
      categoria: "abrigos",
      q: "  lana ",
      color: ["Negro", "Camel"],
      talla: "M",
      precio_min: "500",
      precio_max: "3000",
      orden: "precio-asc",
      pagina: "2",
    });

    expect(filters).toEqual({
      category: "abrigos",
      q: "lana",
      colors: ["Negro", "Camel"],
      sizes: ["M"],
      minPrice: 50_000,
      maxPrice: 300_000,
      sort: "precio-asc",
      page: 2,
    });
  });

  it("descarta valores inválidos sin romper", () => {
    const filters = parseCatalogFilters({
      categoria: "../admin",
      precio_min: "-5",
      precio_max: "abc",
      orden: "aleatorio",
      pagina: "0",
      color: ["", "Negro", "Negro"],
    });

    expect(filters.category).toBeUndefined();
    expect(filters.minPrice).toBeUndefined();
    expect(filters.maxPrice).toBeUndefined();
    expect(filters.sort).toBe("novedades");
    expect(filters.page).toBe(1);
    expect(filters.colors).toEqual(["Negro"]);
  });

  it("corrige un rango de precio invertido", () => {
    const filters = parseCatalogFilters({
      precio_min: "2000",
      precio_max: "500",
    });
    expect(filters.minPrice).toBe(50_000);
    expect(filters.maxPrice).toBe(200_000);
  });
});

describe("serializeCatalogFilters", () => {
  it("omite valores por defecto y es la inversa de parse", () => {
    const original = parseCatalogFilters({
      categoria: "punto",
      color: ["Gris jaspeado"],
      talla: ["S", "M"],
      precio_max: "2500",
      orden: "precio-desc",
      pagina: "3",
    });
    const query = serializeCatalogFilters(original);
    const roundTrip = parseCatalogFilters(
      Object.fromEntries(
        [...new URLSearchParams(query).keys()].map((key) => [
          key,
          new URLSearchParams(query).getAll(key),
        ]),
      ),
    );

    expect(roundTrip).toEqual(original);
    expect(serializeCatalogFilters({ sort: "novedades", page: 1 })).toBe("");
  });

  it("construye el href del catálogo", () => {
    expect(catalogHref({})).toBe("/catalogo");
    expect(catalogHref({ category: "vestidos" })).toBe(
      "/catalogo?categoria=vestidos",
    );
    expect(catalogHref({ q: "seda lavada" })).toBe("/catalogo?q=seda+lavada");
  });
});

describe("helpers", () => {
  it("withFilters vuelve a la página 1", () => {
    const current = parseCatalogFilters({ pagina: "4" });
    expect(withFilters(current, { colors: ["Negro"] }).page).toBe(1);
  });

  it("toggleValue añade y quita", () => {
    expect(toggleValue(["S"], "M")).toEqual(["S", "M"]);
    expect(toggleValue(["S", "M"], "S")).toEqual(["M"]);
  });

  it("hasActiveFilters ignora orden y página", () => {
    expect(
      hasActiveFilters(
        parseCatalogFilters({ orden: "precio-asc", pagina: "2" }),
      ),
    ).toBe(false);
    expect(hasActiveFilters(parseCatalogFilters({ talla: "M" }))).toBe(true);
  });
});
