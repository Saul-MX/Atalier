import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: las URLs de conexión viven aquí, no en schema.prisma.
// La CLI (migraciones) usa la conexión DIRECTA de Supabase.
// La app usa el pooler (DATABASE_URL) vía el driver adapter en src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
