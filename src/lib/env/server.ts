import "server-only";

import { parseEnvValue, serverEnvSchema, type ServerEnvKey } from "./schema";

const cache = new Map<ServerEnvKey, string>();

/**
 * Lee y valida una variable de entorno SECRETA. Solo puede importarse en el
 * servidor: `server-only` rompe el build si un Client Component lo importa.
 */
export function serverEnv(key: ServerEnvKey): string {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const value = parseEnvValue(key, serverEnvSchema[key], process.env[key]);
  cache.set(key, value);
  return value;
}
