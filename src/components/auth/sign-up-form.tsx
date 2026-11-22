"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import {
  authErrorMessage,
  type FieldErrors,
  fieldErrors,
  PASSWORD_MIN,
  signUpSchema,
} from "@/lib/auth/schemas";

import { FormField } from "./form-field";

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const id = useId();
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = signUpSchema.safeParse(data);
    setFormError(null);

    if (!parsed.success) {
      const nextErrors = fieldErrors(parsed.error);
      setErrors(nextErrors);
      const firstInvalid = Object.keys(nextErrors)[0];
      if (firstInvalid) {
        event.currentTarget
          .querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)
          ?.focus();
      }
      return;
    }

    setErrors({});
    setPending(true);
    const { name, email, password } = parsed.data;
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      setPending(false);
      setFormError(authErrorMessage(error));
      requestAnimationFrame(() => formErrorRef.current?.focus());
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <p
          ref={formErrorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      )}
      <FormField
        id={`${id}-name`}
        name="name"
        label="Nombre"
        autoComplete="name"
        required
        error={errors.name}
      />
      <FormField
        id={`${id}-email`}
        name="email"
        type="email"
        label="Correo electrónico"
        autoComplete="email"
        required
        error={errors.email}
      />
      <FormField
        id={`${id}-password`}
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="new-password"
        hint={`Mínimo ${PASSWORD_MIN} caracteres.`}
        required
        error={errors.password}
      />
      <FormField
        id={`${id}-confirm`}
        name="confirmPassword"
        type="password"
        label="Repite la contraseña"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />
      <Button type="submit" size="cta" className="w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
