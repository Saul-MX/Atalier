import { execSync } from "node:child_process";

import { assertLocalDatabase, TEST_DATABASE_URL } from "./test-db-url";

/** Aplica las migraciones (incluidos los CHECK) a la BD de tests. */
export default function setup() {
  assertLocalDatabase(TEST_DATABASE_URL);
  try {
    execSync("pnpm exec prisma migrate deploy", {
      // prisma.config.ts usa DIRECT_URL; dotenv no pisa variables ya definidas.
      env: { ...process.env, DIRECT_URL: TEST_DATABASE_URL },
      stdio: "pipe",
    });
  } catch (error) {
    const output =
      (error as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() ?? "";
    throw new Error(
      `No se pudo migrar la BD de tests. ¿Está levantada? Ejecuta \`pnpm db:test:up\`.\n${output}`,
    );
  }
}
