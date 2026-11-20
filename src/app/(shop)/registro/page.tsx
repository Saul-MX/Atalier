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
import { SignUpForm } from "@/components/auth/sign-up-form";
import { safeRedirect, signInHref } from "@/lib/safe-redirect";
import { getSession } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Crear cuenta",
  robots: { index: false },
};

export default function SignUpPage({ searchParams }: PageProps<"/registro">) {
  return (
    <AuthShell
      title="Crear cuenta"
      description="Guarda tus datos y consulta el estado de tus pedidos."
    >
      <Suspense fallback={<AuthFormSkeleton fields={4} />}>
        <SignUpContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function SignUpContent({
  searchParams,
}: Pick<PageProps<"/registro">, "searchParams">) {
  const params = await searchParams;
  const next = safeRedirect(
    typeof params.next === "string" ? params.next : undefined,
  );
  if (await getSession()) redirect(next);

  return (
    <div className="flex flex-col gap-6">
      <GoogleButton next={next} />
      <OrDivider />
      <SignUpForm next={next} />
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={signInHref(next === "/" ? undefined : next)}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
