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
  signInSchema,
} from "@/lib/auth/schemas";

import { FormField } from "./form-field";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const id = useId();
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = signInSchema.safeParse(data);
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
    const { error } = await authClient.signIn.email(parsed.data);
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
        autoComplete="current-password"
        required
        error={errors.password}
      />
      <Button type="submit" size="cta" className="w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {pending ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
