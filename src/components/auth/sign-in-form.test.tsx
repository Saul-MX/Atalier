import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInEmail, router } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  router: { replace: vi.fn(), refresh: vi.fn() },
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: { signIn: { email: signInEmail } },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { SignInForm } = await import("./sign-in-form");

describe("SignInForm", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    router.replace.mockClear();
  });

  it("muestra errores accesibles sin llamar al servidor", async () => {
    const user = userEvent.setup();
    render(<SignInForm next="/cuenta" />);

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    const email = screen.getByLabelText("Correo electrónico");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Introduce tu correo.");
    expect(email).toHaveFocus();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("muestra el error del servidor traducido", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({
      error: { code: "INVALID_EMAIL_OR_PASSWORD", status: 401 },
    });
    render(<SignInForm next="/cuenta" />);

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await user.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correo o contraseña incorrectos.",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("inicia sesión y navega al destino", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({ data: {}, error: null });
    render(<SignInForm next="/cuenta" />);

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await user.type(screen.getByLabelText("Contraseña"), "secreta123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(signInEmail).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "secreta123",
    });
    expect(router.replace).toHaveBeenCalledWith("/cuenta");
  });
});
