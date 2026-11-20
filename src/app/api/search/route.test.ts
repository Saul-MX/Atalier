// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchProducts } = vi.hoisted(() => ({ searchProducts: vi.fn() }));
vi.mock("@/server/catalog/queries", () => ({ searchProducts }));

const { GET } = await import("./route");

const request = (q?: string) =>
  new NextRequest(
    `http://localhost/api/search${q === undefined ? "" : `?q=${encodeURIComponent(q)}`}`,
  );

describe("GET /api/search", () => {
  beforeEach(() => {
    searchProducts.mockReset();
  });

  it.each([undefined, "", "a", "x".repeat(61)])(
    "responde 400 si q no es válido (%j)",
    async (q) => {
      const response = await GET(request(q));
      expect(response.status).toBe(400);
      expect(searchProducts).not.toHaveBeenCalled();
    },
  );

  it("devuelve resultados para un término válido (recortado)", async () => {
    searchProducts.mockResolvedValue([{ slug: "abrigo", name: "Abrigo" }]);

    const response = await GET(request("  abrigo "));

    expect(response.status).toBe(200);
    expect(searchProducts).toHaveBeenCalledWith("abrigo");
    expect(await response.json()).toEqual({
      results: [{ slug: "abrigo", name: "Abrigo" }],
    });
  });

  it("responde 500 sin filtrar detalles si falla la consulta", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    searchProducts.mockRejectedValue(new Error("connection refused"));

    const response = await GET(request("abrigo"));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("connection");
  });
});
