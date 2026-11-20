import { LayoutDashboardIcon } from "lucide-react";
import { type Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Panel" };

export default function AdminHomePage() {
  return (
    <Suspense>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  // Verificación real del rol en la propia página (no solo en el layout/proxy).
  const { user } = await requireAdminPage("/admin");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Hola, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Panel de administración de ATELIER.
        </p>
      </header>
      {/* Catálogo (Fase 4), pedidos y métricas (Fase 6). */}
      <EmptyState
        icon={LayoutDashboardIcon}
        title="El panel está en construcción"
        description="Aquí podrás gestionar productos, inventario y pedidos."
      />
    </div>
  );
}
