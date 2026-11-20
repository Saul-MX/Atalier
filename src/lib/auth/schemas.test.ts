import { describe, expect, it } from "vitest";

import { isAdminRole, isBanned } from "./roles";
import {
  authErrorMessage,
  fieldErrors,
  signInSchema,
  signUpSchema,
} from "./schemas";

describe("esquemas de acceso", () => {
  it("valida el inicio de sesión", () => {
    const result = signInSchema.safeParse({
      email: "no-es-correo",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({
        email: "Introduce un correo válido.",
        password: "Introduce tu contraseña.",
      });
    }
  });

  it("normaliza el correo y exige contraseñas coincidentes", () => {
    const ok = signUpSchema.safeParse({
      name: " Ana ",
      email: " ana@example.com ",
      password: "secreta123",
      confirmPassword: "secreta123",
    });
    expect(ok.success && ok.data).toMatchObject({
      name: "Ana",
      email: "ana@example.com",
    });

    const mismatch = signUpSchema.safeParse({
      name: "Ana",
      email: "ana@example.com",
      password: "secreta123",
      confirmPassword: "otra",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(fieldErrors(mismatch.error).confirmPassword).toBe(
        "Las contraseñas no coinciden.",
      );
    }
  });

  it("traduce los errores de Better Auth", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      "Correo o contraseña incorrectos.",
    );
    expect(authErrorMessage({ status: 429 })).toMatch(/Demasiados intentos/);
    expect(authErrorMessage({ code: "ALGO_RARO" })).toMatch(
      /Inténtalo de nuevo/,
    );
  });
});

describe("roles", () => {
  it("detecta el rol admin en listas separadas por comas", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("user,admin")).toBe(true);
    expect(isAdminRole("superadmin")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });

  it("evalúa la vigencia del baneo", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    expect(isBanned({ banned: false }, now)).toBe(false);
    expect(isBanned({ banned: true, banExpires: null }, now)).toBe(true);
    expect(
      isBanned({ banned: true, banExpires: new Date("2026-11-21") }, now),
    ).toBe(true);
    expect(
      isBanned({ banned: true, banExpires: new Date("2026-11-19") }, now),
    ).toBe(false);
  });
});
