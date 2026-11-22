import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";

import { authOptions } from "./options";

const BASE_URL = "http://localhost:3000";

const auth = betterAuth({
  ...authOptions,
  baseURL: BASE_URL,
  secret: "test-secret-test-secret-test-secret",
  database: memoryAdapter({}),
});

const post = (path: string) =>
  auth.handler(
    new Request(`${BASE_URL}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE_URL },
      body: "{}",
    }),
  );

describe("authOptions", () => {
  it.each(authOptions.disabledPaths)(
    "desactiva %s (la cuenta demo es compartida)",
    async (path) => {
      expect((await post(path)).status).toBe(404);
    },
  );

  it("mantiene el inicio de sesión con correo", async () => {
    // Credenciales inválidas → 400/401, nunca 404.
    expect((await post("/sign-in/email")).status).not.toBe(404);
  });
});
