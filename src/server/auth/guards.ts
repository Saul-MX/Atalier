import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth, type AuthSession } from "@/lib/auth";
import { isAdminRole, isBanned } from "@/lib/auth/roles";
import { signInHref } from "@/lib/safe-redirect";

/**
 * Autorización en el servidor (capa 2 de 2; el proxy solo redirige).
 *
 * - Route Handlers  → `withAdmin(handler)` / `withUser(handler)` → 401/403 JSON
 * - Server Actions  → `await requireAdmin()` al inicio; `AuthError` se captura
 *                     con `toActionError()`
 * - Páginas         → `requireAdminPage()` / `requireUserPage()` (redirigen)
 *
 * La sesión NO se cachea entre peticiones: retirar el rol de admin o banear a
 * un usuario surte efecto en la siguiente petición. `cache()` solo deduplica
 * dentro de una misma petición.
 */

export type Session = AuthSession;

export class AuthError extends Error {
  constructor(
    readonly status: 401 | 403,
    message = status === 401 ? "No autenticado" : "No autorizado",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AuthError(401);
  if (isBanned(session.user)) throw new AuthError(403, "Cuenta suspendida");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (!isAdminRole(session.user.role)) throw new AuthError(403);
  return session;
}

export type AdminAccess =
  | { status: "ok"; session: Session }
  | { status: "unauthenticated" }
  | { status: "forbidden" };

/** Para layouts: decide qué mostrar sin lanzar. */
export async function getAdminAccess(): Promise<AdminAccess> {
  try {
    return { status: "ok", session: await requireAdmin() };
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: error.status === 401 ? "unauthenticated" : "forbidden" };
    }
    throw error;
  }
}

/** Páginas privadas: redirige a /ingresar conservando el destino. */
export async function requireUserPage(currentPath: string): Promise<Session> {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      redirect(signInHref(currentPath));
    }
    throw error;
  }
}

/** Páginas de admin: sin sesión → /ingresar; sin rol → AuthError (403). */
export async function requireAdminPage(currentPath: string): Promise<Session> {
  await requireUserPage(currentPath);
  return requireAdmin();
}

type RouteHandler<Ctx> = (
  request: Request,
  context: Ctx,
  session: Session,
) => Promise<Response> | Response;

function authErrorResponse(error: AuthError): Response {
  return Response.json({ error: error.message }, { status: error.status });
}

function guard<Ctx>(check: () => Promise<Session>, handler: RouteHandler<Ctx>) {
  return async (request: Request, context: Ctx): Promise<Response> => {
    let session: Session;
    try {
      session = await check();
    } catch (error) {
      if (error instanceof AuthError) return authErrorResponse(error);
      throw error;
    }
    return handler(request, context, session);
  };
}

/** Envuelve un Route Handler: 401 sin sesión, 403 sin rol admin. */
export function withAdmin<Ctx = unknown>(handler: RouteHandler<Ctx>) {
  return guard(requireAdmin, handler);
}

export function withUser<Ctx = unknown>(handler: RouteHandler<Ctx>) {
  return guard(requireUser, handler);
}

export type ActionError = { ok: false; error: string; status: 401 | 403 };

/** Convierte un AuthError en un resultado serializable para Server Actions. */
export function toActionError(error: unknown): ActionError {
  if (error instanceof AuthError) {
    return {
      ok: false,
      status: error.status,
      error:
        error.status === 401
          ? "Tu sesión ha caducado. Vuelve a iniciar sesión."
          : "No tienes permisos para realizar esta acción.",
    };
  }
  throw error;
}
