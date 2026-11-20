import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

import { signInHref } from "@/lib/safe-redirect";

/**
 * Capa 1 de 2: comprobación OPTIMISTA (solo existencia de la cookie de sesión)
 * para redirigir rápido a /ingresar. No valida la sesión ni el rol: eso lo
 * hacen `requireAdmin()` / `requireUser()` en cada página, Route Handler y
 * Server Action (src/server/auth/guards.ts).
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(
    new URL(signInHref(`${pathname}${search}`), request.url),
  );
}

export const config = {
  matcher: ["/admin/:path*", "/cuenta/:path*"],
};
