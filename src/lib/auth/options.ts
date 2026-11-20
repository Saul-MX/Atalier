import { type BetterAuthOptions } from "better-auth";
import { admin } from "better-auth/plugins";

import { ADMIN_ROLE, USER_ROLE } from "./roles";

/**
 * Opciones de Better Auth compartidas entre la app (`./index.ts`) y la CLI
 * (`/auth.config.ts`). Aquí NO se leen secretos ni se toca la BD: así la CLI
 * puede cargarlas sin `server-only` y el esquema generado coincide siempre
 * con lo que usa la app.
 */
export const authOptions = {
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [admin({ defaultRole: USER_ROLE, adminRoles: [ADMIN_ROLE] })],
} satisfies Partial<BetterAuthOptions>;

export { ADMIN_ROLE } from "./roles";
