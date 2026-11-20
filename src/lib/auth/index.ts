import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { serverEnv } from "@/lib/env/server";
import { prisma } from "@/lib/prisma";

import { authOptions } from "./options";

/**
 * Instancia de Better Auth de la app (solo servidor).
 * Las opciones que afectan al esquema viven en ./options.ts (compartidas con
 * la CLI); aquí se añaden secretos, proveedores y la integración con Next.
 */
export const auth = betterAuth({
  ...authOptions,
  secret: serverEnv("BETTER_AUTH_SECRET"),
  baseURL: serverEnv("BETTER_AUTH_URL"),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: serverEnv("GOOGLE_CLIENT_ID"),
      clientSecret: serverEnv("GOOGLE_CLIENT_SECRET"),
      prompt: "select_account",
    },
  },
  account: {
    // Permite entrar con Google a una cuenta creada con el mismo correo
    // (Google verifica el email, por eso es un proveedor de confianza).
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  // nextCookies debe ir el último: fija cookies desde Server Actions.
  plugins: [...authOptions.plugins, nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
