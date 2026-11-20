/**
 * Instancia de Better Auth SOLO para herramientas fuera de Next.js:
 *  - la CLI (`pnpm auth:generate`), que no puede cargar módulos `server-only`;
 *  - el seed (`prisma/seed.ts`).
 * La app usa `src/lib/auth/index.ts`. Ambas comparten `authOptions`.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { PrismaClient } from "./src/generated/prisma/client";
import { authOptions } from "./src/lib/auth/options";

// Herramientas locales: preferimos la conexión de migraciones (DIRECT_URL).
export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

export const auth = betterAuth({
  ...authOptions,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
});
