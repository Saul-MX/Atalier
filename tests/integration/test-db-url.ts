/** URL de la BD de tests. Por defecto, el Postgres de docker-compose.yml. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://atelier:atelier@localhost:54329/atelier_test";

/**
 * Los tests BORRAN tablas: nunca deben apuntar a Supabase ni a otra BD
 * remota. Solo se aceptan hosts locales.
 */
export function assertLocalDatabase(url: string): void {
  const { hostname } = new URL(url);
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) {
    throw new Error(
      `TEST_DATABASE_URL debe apuntar a una BD local (host actual: ${hostname}). Los tests de integración vacían las tablas.`,
    );
  }
}
