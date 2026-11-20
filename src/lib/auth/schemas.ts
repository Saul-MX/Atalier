import { z } from "zod";

/**
 * Validación de los formularios de acceso. Better Auth vuelve a validar en el
 * servidor (formato de email, longitud de contraseña), esto da feedback rápido.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const email = z
  .string()
  .trim()
  .min(1, "Introduce tu correo.")
  .pipe(z.email("Introduce un correo válido."));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Introduce tu contraseña."),
});

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Tu nombre debe tener al menos 2 caracteres.")
      .max(60, "Máximo 60 caracteres."),
    email,
    password: z
      .string()
      .min(PASSWORD_MIN, `Mínimo ${PASSWORD_MIN} caracteres.`)
      .max(PASSWORD_MAX, `Máximo ${PASSWORD_MAX} caracteres.`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type FieldErrors = Partial<Record<string, string>>;

/** Primer mensaje de error por campo, listo para pintar en el formulario. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/** Traduce los códigos de error de Better Auth a mensajes para el usuario. */
export function authErrorMessage(error: {
  code?: string;
  status?: number;
  message?: string;
}): string {
  if (error.status === 429) {
    return "Demasiados intentos. Espera un momento y vuelve a probar.";
  }
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Correo o contraseña incorrectos.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Ya existe una cuenta con este correo. Inicia sesión.";
    case "PASSWORD_TOO_SHORT":
      return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
    case "PASSWORD_TOO_LONG":
      return `La contraseña no puede superar ${PASSWORD_MAX} caracteres.`;
    case "INVALID_EMAIL":
      return "Introduce un correo válido.";
    case "BANNED_USER":
      return "Tu cuenta está suspendida. Contacta con soporte.";
    default:
      return "No pudimos completar la operación. Inténtalo de nuevo.";
  }
}
