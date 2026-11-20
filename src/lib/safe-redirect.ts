/**
 * Valida un destino de redirección recibido por URL (`?next=`) para evitar
 * open redirects: solo se aceptan rutas relativas del mismo sitio.
 */
export function safeRedirect(
  target: string | null | undefined,
  fallback = "/",
): string {
  if (!target || typeof target !== "string") return fallback;
  const value = target.trim();

  // Debe ser una ruta absoluta del sitio, no "//evil.com" ni "/\evil.com".
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return fallback;
  }

  try {
    const base = "http://atelier.local";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    // Nunca volver a las páginas de autenticación.
    if (url.pathname === "/ingresar" || url.pathname === "/registro") {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function signInHref(next?: string): string {
  const destination = safeRedirect(next, "");
  return destination
    ? `/ingresar?next=${encodeURIComponent(destination)}`
    : "/ingresar";
}
