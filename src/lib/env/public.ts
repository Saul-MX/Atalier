import { parseEnvValue, publicEnvSchema, type PublicEnvKey } from "./schema";

// Next.js solo incrusta las variables NEXT_PUBLIC_* en el bundle del cliente
// cuando se referencian de forma literal, por eso se listan una a una.
const rawPublicEnv: Record<PublicEnvKey, string | undefined> = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

/** Lee y valida una variable PÚBLICA (segura para el navegador). */
export function publicEnv(key: PublicEnvKey): string {
  return parseEnvValue(key, publicEnvSchema[key], rawPublicEnv[key]);
}
