import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  AuthFormSkeleton,
  AuthShell,
  OrDivider,
} from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeRedirect } from "@/lib/safe-redirect";
import { getSession } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false },
};

export default function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  return (
    <AuthShell
      title="Iniciar sesión"
      description="Accede para ver tus pedidos y comprar más rápido."
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <SignInContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function SignInContent({
  searchParams,
}: Pick<PageProps<"/ingresar">, "searchParams">) {
  const params = await searchParams;
  const next = safeRedirect(
    typeof params.next === "string" ? params.next : undefined,
  );
  if (await getSession()) redirect(next);

  const googleFailed = params.error !== undefined;
  const signUpHref =
    next === "/" ? "/registro" : `/registro?next=${encodeURIComponent(next)}`;

  return (
    <div className="flex flex-col gap-6">
      {googleFailed && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          No se pudo iniciar sesión con Google. Inténtalo de nuevo.
        </p>
      )}
      <GoogleButton next={next} />
      <OrDivider />
      <SignInForm next={next} />
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          href={signUpHref}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
