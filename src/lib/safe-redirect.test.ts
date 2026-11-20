import { describe, expect, it } from "vitest";

import { safeRedirect, signInHref } from "./safe-redirect";

describe("safeRedirect (anti open-redirect)", () => {
  it.each([
    ["/cuenta", "/cuenta"],
    ["/catalogo?color=Negro&talla=M", "/catalogo?color=Negro&talla=M"],
    ["/producto/abrigo#galeria", "/producto/abrigo#galeria"],
  ])("acepta rutas internas: %s", (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    "",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "evil.com/path",
    " //evil.com",
  ])("rechaza %j", (input) => {
    expect(safeRedirect(input)).toBe("/");
  });

  it("no redirige de vuelta a las páginas de acceso", () => {
    expect(safeRedirect("/ingresar")).toBe("/");
    expect(safeRedirect("/registro?next=/x", "/cuenta")).toBe("/cuenta");
  });

  it("signInHref codifica el destino", () => {
    expect(signInHref("/admin")).toBe("/ingresar?next=%2Fadmin");
    expect(signInHref("https://evil.com")).toBe("/ingresar");
    expect(signInHref()).toBe("/ingresar");
  });
});
