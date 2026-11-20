import { ArrowRightIcon, PackageIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

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
      {/* Pedidos y métricas llegan en la Fase 6. */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <Link
            href="/admin/productos"
            className="group flex h-full flex-col gap-3 rounded-lg border p-5 transition-colors hover:bg-muted/50"
          >
            <PackageIcon
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="flex items-center gap-1 font-medium">
              Productos
              <ArrowRightIcon
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
            <span className="text-sm text-muted-foreground">
              Catálogo, fotos, variantes y stock.
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
