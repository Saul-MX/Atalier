import { ShieldAlertIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signInHref } from "@/lib/safe-redirect";
import { getAdminAccess } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin ATELIER" },
  robots: { index: false, follow: false },
};

/**
 * Layout del panel. Comprueba el rol para decidir QUÉ MOSTRAR, pero no es la
 * barrera de seguridad: cada página, Route Handler y Server Action de admin
 * vuelve a llamar a requireAdmin().
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#contenido-admin"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <header className="border-b bg-sidebar">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="font-semibold tracking-[0.3em]">
            ATELIER
          </Link>
          <span className="rounded-sm bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
            Admin
          </span>
          <div className="hidden sm:block">
            <AdminNav />
          </div>
          <ThemeToggle className="ml-auto" />
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Ver tienda
          </Link>
        </div>
        <div className="mx-auto w-full max-w-7xl px-2 pb-2 sm:hidden">
          <AdminNav />
        </div>
      </header>
      <main
        id="contenido-admin"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 outline-none sm:px-6 lg:px-8"
      >
        <Suspense fallback={<AdminSkeleton />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  const access = await getAdminAccess();

  if (access.status === "unauthenticated") redirect(signInHref("/admin"));

  if (access.status === "forbidden") {
    return (
      <EmptyState
        icon={ShieldAlertIcon}
        title="Acceso restringido"
        description="Esta sección es solo para administradores. Si crees que es un error, contacta con el responsable de la tienda."
        headingLevel="h1"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/">Volver a la tienda</Link>
            </Button>
            <SignOutButton />
          </div>
        }
      />
    );
  }

  return children;
}

function AdminSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label="Cargando panel"
    >
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
