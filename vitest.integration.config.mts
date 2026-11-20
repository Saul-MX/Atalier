import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Tests de integración contra Postgres REAL (Docker, ver docker-compose.yml):
 *   pnpm db:test:up && pnpm test:integration
 * Stripe se simula; la BD, las transacciones y los bloqueos son reales.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/env.ts"],
    // Comparten la BD: un archivo cada vez.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    restoreMocks: true,
  },
});
