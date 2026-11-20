import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { CustomerOrders } from "@/components/orders/customer-orders";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdminRole } from "@/lib/auth/roles";
import { requireUserPage } from "@/server/auth/guards";
import { listCustomerOrders } from "@/server/services/orders";

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
  // Solo los pedidos de ESTE usuario (filtro por userId en el servidor).
  const orders = await listCustomerOrders(user.id);

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
        <CustomerOrders orders={orders} />
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
