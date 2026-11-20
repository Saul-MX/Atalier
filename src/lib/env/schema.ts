import { z } from "zod";

/**
 * Esquemas de variables de entorno. Se validan de forma perezosa y por clave:
 * cada variable se comprueba la primera vez que se lee, para que las fases
 * tempranas funcionen sin las credenciales de fases posteriores.
 */
export const serverEnvSchema = {
  /** Pooler de Supabase (Transaction mode, puerto 6543). Lo usa la app. */
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  /** Solo se aceptan claves de modo test. */
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_test_", "Usa una clave de modo test (sk_test_…)"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  CRON_SECRET: z.string().min(16),
} satisfies Record<string, z.ZodType<string>>;

export const publicEnvSchema = {
  NEXT_PUBLIC_APP_URL: z.url(),
} satisfies Record<string, z.ZodType<string>>;

export type ServerEnvKey = keyof typeof serverEnvSchema;
export type PublicEnvKey = keyof typeof publicEnvSchema;

export class EnvError extends Error {
  constructor(key: string, detail: string) {
    super(
      `Variable de entorno inválida o ausente: ${key} (${detail}). Revisa tu .env (plantilla en .env.example).`,
    );
    this.name = "EnvError";
  }
}

export function parseEnvValue<S extends z.ZodType<string>>(
  key: string,
  schema: S,
  value: string | undefined,
): z.infer<S> {
  const result = schema.safeParse(value === "" ? undefined : value);
  if (!result.success) {
    throw new EnvError(key, result.error.issues[0]?.message ?? "inválida");
  }
  return result.data;
}
