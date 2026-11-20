"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useTransition } from "react";

import { type CatalogFilters, catalogHref } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils";

type CatalogNavigation = {
  isPending: boolean;
  /**
   * Navega a la URL de los filtros dentro de una transición. `onStart` se
   * ejecuta dentro de la misma transición (para actualizaciones optimistas).
   */
  navigate: (filters: Partial<CatalogFilters>, onStart?: () => void) => void;
};

const CatalogNavigationContext = createContext<CatalogNavigation | null>(null);

/**
 * Comparte una única transición entre filtros, orden y resultados: mientras
 * el servidor responde, la cuadrícula se atenúa y queda `aria-busy`.
 */
export function CatalogNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (filters: Partial<CatalogFilters>, onStart?: () => void) => {
      startTransition(() => {
        onStart?.();
        router.push(catalogHref(filters), { scroll: false });
      });
    },
    [router],
  );

  return (
    <CatalogNavigationContext value={{ isPending, navigate }}>
      {children}
    </CatalogNavigationContext>
  );
}

export function useCatalogNavigation(): CatalogNavigation {
  const context = use(CatalogNavigationContext);
  if (!context) {
    throw new Error(
      "useCatalogNavigation debe usarse dentro de CatalogNavigationProvider",
    );
  }
  return context;
}

export function CatalogResults({ children }: { children: React.ReactNode }) {
  const { isPending } = useCatalogNavigation();
  return (
    <div
      aria-busy={isPending}
      className={cn(
        "transition-opacity duration-200",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </div>
  );
}
