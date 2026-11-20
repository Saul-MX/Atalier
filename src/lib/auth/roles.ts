/** Módulo puro (válido en cliente y servidor): sin dependencias de Better Auth. */
export const ADMIN_ROLE = "admin";
export const USER_ROLE = "user";

/**
 * El plugin admin guarda los roles como texto separado por comas
 * (p. ej. "user,admin"). Esta es la ÚNICA comprobación de rol de la app.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role
    .split(",")
    .map((r) => r.trim())
    .includes(ADMIN_ROLE);
}

/** Un baneo sin fecha de expiración es permanente. */
export function isBanned(
  user: { banned?: boolean | null; banExpires?: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (!user.banned) return false;
  if (!user.banExpires) return true;
  return new Date(user.banExpires) > now;
}
