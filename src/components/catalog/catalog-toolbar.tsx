"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  type CatalogFilters as Filters,
  type CatalogSort,
  SORT_OPTIONS,
  withFilters,
} from "@/lib/catalog/filters-url";
import { type CatalogFacets } from "@/lib/catalog/types";

import { CatalogFilters } from "./catalog-filters";
import { useCatalogNavigation } from "./catalog-navigation";

/** Barra superior: botón de filtros (móvil) y selector de orden. */
export function CatalogToolbar({
  filters,
  facets,
  activeCount,
}: {
  filters: Filters;
  facets: CatalogFacets;
  activeCount: number;
}) {
  const { navigate } = useCatalogNavigation();
  const [open, setOpen] = useState(false);
  const sortId = useId();

  return (
    <div className="flex items-center justify-between gap-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden">
            <SlidersHorizontalIcon aria-hidden="true" />
            Filtros
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {activeCount}
                <span className="sr-only"> activos</span>
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 overflow-y-auto">
          <SheetHeader className="border-b">
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              Los resultados se actualizan al instante.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <CatalogFilters
              filters={filters}
              facets={facets}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="ml-auto flex items-center gap-2">
        <label htmlFor={sortId} className="text-sm text-muted-foreground">
          Ordenar por
        </label>
        <select
          id={sortId}
          value={filters.sort}
          onChange={(event) =>
            navigate(
              withFilters(filters, {
                sort: event.target.value as CatalogSort,
              }),
            )
          }
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {Object.entries(SORT_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
