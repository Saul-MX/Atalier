import { PackageIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdminRole } from "@/lib/auth/roles";
import { requireUserPage } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <Container className="py-10">
      <Suspense fallback={<AccountSkeleton />}>
        <AccountContent />
      </Suspense>
    </Container>
  );
}

async function AccountContent() {
  const { user } = await requireUserPage("/cuenta");

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Mi cuenta</h1>
          <p className="text-sm text-muted-foreground">
            {user.name} · {user.email}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdminRole(user.role) && (
            <Button asChild variant="outline">
              <Link href="/admin">Panel de administración</Link>
            </Button>
          )}
          <SignOutButton />
        </div>
      </header>

      <section aria-labelledby="pedidos" className="flex flex-col gap-4">
        <h2 id="pedidos" className="text-xl font-semibold tracking-tight">
          Mis pedidos
        </h2>
        {/* El historial de pedidos se implementa en la Fase 6. */}
        <EmptyState
          icon={PackageIcon}
          title="Aún no tienes pedidos"
          description="Cuando completes una compra, podrás seguir su estado aquí."
          headingLevel="h3"
          action={
            <Button asChild>
              <Link href="/catalogo">Explorar el catálogo</Link>
            </Button>
          }
        />
      </section>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div
      className="flex flex-col gap-10"
      role="status"
      aria-label="Cargando cuenta"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
