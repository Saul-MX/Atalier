import { type z } from "zod";

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
