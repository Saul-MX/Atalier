import { type BetterAuthOptions } from "better-auth";
import { admin } from "better-auth/plugins";

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
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
} satisfies Partial<BetterAuthOptions>;

export const ADMIN_ROLE = "admin";
