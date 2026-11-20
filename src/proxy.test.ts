// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, proxy } from "./proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });

describe("proxy (capa optimista)", () => {
  it("protege /admin y /cuenta", () => {
    expect(config.matcher).toEqual(["/admin/:path*", "/cuenta/:path*"]);
  });

  it("redirige a /ingresar con el destino si no hay cookie de sesión", () => {
    const response = proxy(request("/admin/productos?estado=activo"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/ingresar?next=%2Fadmin%2Fproductos%3Festado%3Dactivo",
    );
  });

  it.each([
    "better-auth.session_token=abc.def",
    "__Secure-better-auth.session_token=abc.def",
  ])("deja pasar si existe la cookie (%s)", (cookie) => {
    const response = proxy(request("/admin", cookie));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
