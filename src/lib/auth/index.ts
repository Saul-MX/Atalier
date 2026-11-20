import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/lib/prisma";

import { authOptions } from "./options";

// Instancia de Better Auth de la app. Google, nextCookies, secret/baseURL
// explícitos y el handler HTTP se añaden en la Fase 3.
export const auth = betterAuth({
  ...authOptions,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
});
