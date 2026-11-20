import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env/server";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: serverEnv("DATABASE_URL") });
  return new PrismaClient({ adapter });
}

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

// Un único cliente por proceso: en desarrollo, HMR reevalúa los módulos y
// crearía un pool nuevo en cada recarga si no se guarda en globalThis.
const globalForPrisma = globalThis as unknown as {
  prisma?: AppPrismaClient;
};

export const prisma: AppPrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
