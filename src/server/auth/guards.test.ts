// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, redirect } = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect }));

const guards = await import("./guards");
const {
  AuthError,
  getAdminAccess,
  requireAdmin,
  requireUser,
  requireUserPage,
  toActionError,
  withAdmin,
} = guards;

type FakeUser = {
  role?: string | null;
  banned?: boolean | null;
  banExpires?: Date | null;
};

function sessionWith(user: FakeUser) {
  return {
    session: { id: "s1", userId: "u1" },
    user: { id: "u1", name: "Ana", email: "ana@example.com", ...user },
  };
}

const DAY = 24 * 60 * 60 * 1000;

describe("requireAdmin", () => {
  beforeEach(() => {
    getSession.mockReset();
    redirect.mockClear();
  });

  it("lanza 401 sin sesión", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
  });

  it.each([null, "", "user", "customer", "administrator"])(
    "lanza 403 si el rol es %j",
    async (role) => {
      getSession.mockResolvedValue(sessionWith({ role }));
      await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
    },
  );

  it.each(["admin", "user,admin", " user , admin "])(
    "permite el rol %j",
    async (role) => {
      getSession.mockResolvedValue(sessionWith({ role }));
      await expect(requireAdmin()).resolves.toMatchObject({
        user: { id: "u1" },
      });
    },
  );

  it("bloquea a un admin baneado (permanente o vigente)", async () => {
    getSession.mockResolvedValue(sessionWith({ role: "admin", banned: true }));
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });

    getSession.mockResolvedValue(
      sessionWith({
        role: "admin",
        banned: true,
        banExpires: new Date(Date.now() + DAY),
      }),
    );
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  });

  it("permite a un admin cuyo baneo ya expiró", async () => {
    getSession.mockResolvedValue(
      sessionWith({
        role: "admin",
        banned: true,
        banExpires: new Date(Date.now() - DAY),
      }),
    );
    await expect(requireAdmin()).resolves.toBeTruthy();
  });

  it("requireUser acepta cualquier usuario no baneado", async () => {
    getSession.mockResolvedValue(sessionWith({ role: "user" }));
    await expect(requireUser()).resolves.toBeTruthy();
  });
});

describe("withAdmin (Route Handlers)", () => {
  const handler = vi.fn(async () => Response.json({ ok: true }));
  const call = withAdmin(handler);
  const request = new Request("http://localhost/api/admin/products", {
    method: "POST",
  });

  beforeEach(() => {
    getSession.mockReset();
    handler.mockClear();
  });

  it("responde 401 sin sesión y no ejecuta el handler", async () => {
    getSession.mockResolvedValue(null);
    const response = await call(request, {});
    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("responde 403 a un usuario sin rol admin (aunque llame a la API directamente)", async () => {
    getSession.mockResolvedValue(sessionWith({ role: "user" }));
    const response = await call(request, {});
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "No autorizado" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("ejecuta el handler con la sesión si es admin", async () => {
    getSession.mockResolvedValue(sessionWith({ role: "admin" }));
    const response = await call(request, { params: {} });
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      request,
      { params: {} },
      expect.objectContaining({ user: expect.objectContaining({ id: "u1" }) }),
    );
  });

  it("no oculta errores que no son de autorización", async () => {
    getSession.mockRejectedValue(new Error("db down"));
    await expect(call(request, {})).rejects.toThrow("db down");
  });
});

describe("páginas y acciones", () => {
  beforeEach(() => {
    getSession.mockReset();
    redirect.mockClear();
  });

  it("requireUserPage redirige a /ingresar conservando el destino", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireUserPage("/cuenta?tab=pedidos")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith(
      "/ingresar?next=%2Fcuenta%3Ftab%3Dpedidos",
    );
  });

  it("getAdminAccess distingue los tres estados", async () => {
    getSession.mockResolvedValue(null);
    expect((await getAdminAccess()).status).toBe("unauthenticated");
    getSession.mockResolvedValue(sessionWith({ role: "user" }));
    expect((await getAdminAccess()).status).toBe("forbidden");
    getSession.mockResolvedValue(sessionWith({ role: "admin" }));
    expect((await getAdminAccess()).status).toBe("ok");
  });

  it("toActionError devuelve un resultado serializable y relanza otros errores", () => {
    expect(toActionError(new AuthError(403))).toEqual({
      ok: false,
      status: 403,
      error: "No tienes permisos para realizar esta acción.",
    });
    expect(() => toActionError(new Error("otro"))).toThrow("otro");
  });
});
