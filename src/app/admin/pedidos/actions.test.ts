// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, advanceOrder, refresh } = vi.hoisted(() => ({
  getSession: vi.fn(),
  advanceOrder: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ refresh }));
vi.mock("@/server/services/admin-orders", () => ({ advanceOrder }));

const { advanceOrderAction } = await import("./actions");

const asRole = (role: string | null) =>
  getSession.mockResolvedValue({
    session: { id: "s1", userId: "u1" },
    user: { id: "u1", name: "Ana", email: "ana@example.com", role },
  });

describe("advanceOrderAction", () => {
  beforeEach(() => {
    getSession.mockReset();
    advanceOrder.mockReset();
    refresh.mockClear();
  });

  it("401 sin sesión y 403 sin rol admin, sin tocar el pedido", async () => {
    getSession.mockResolvedValue(null);
    await expect(advanceOrderAction("o1", "PAID")).resolves.toMatchObject({
      ok: false,
      status: 401,
    });
    asRole("user");
    await expect(advanceOrderAction("o1", "PAID")).resolves.toMatchObject({
      ok: false,
      status: 403,
    });
    expect(advanceOrder).not.toHaveBeenCalled();
  });

  it("rechaza estados desconocidos antes de llegar al servicio", async () => {
    asRole("admin");
    await expect(advanceOrderAction("o1", "REFUNDED")).resolves.toMatchObject({
      ok: false,
    });
    expect(advanceOrder).not.toHaveBeenCalled();
  });

  it("avanza y refresca la vista", async () => {
    asRole("admin");
    advanceOrder.mockResolvedValue({ ok: true, status: "SHIPPED" });
    await expect(advanceOrderAction("o1", "PAID")).resolves.toEqual({
      ok: true,
      message: "Pedido marcado como «Enviado».",
    });
    expect(advanceOrder).toHaveBeenCalledWith("o1", "PAID");
    expect(refresh).toHaveBeenCalled();
  });

  it("explica el conflicto si otro admin ya lo cambió", async () => {
    asRole("admin");
    advanceOrder.mockResolvedValue({
      ok: false,
      reason: "stale",
      current: "DELIVERED",
    });
    await expect(advanceOrderAction("o1", "PAID")).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining("«Entregado»"),
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
