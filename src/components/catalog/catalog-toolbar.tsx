"use client";

import { ChevronDownIcon, PlusIcon } from "lucide-react";
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

/** Barra superior: número de productos, panel de filtros y orden. */
export function CatalogToolbar({
  filters,
  facets,
  activeCount,
  total,
}: {
  filters: Filters;
  facets: CatalogFacets;
  activeCount: number;
  total: number;
}) {
  const { navigate } = useCatalogNavigation();
  const [open, setOpen] = useState(false);
  const sortId = useId();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <p className="text-xs text-muted-foreground" role="status">
        {total === 1 ? "1 producto" : `${total} productos`}
      </p>

      <div className="flex items-center gap-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 px-0 label-caps hover:bg-transparent hover:underline aria-expanded:bg-transparent"
            >
              Filtrar
              {activeCount > 0 && (
                <span className="tabular-nums">
                  ({activeCount}
                  <span className="sr-only"> activos</span>)
                </span>
              )}
              <PlusIcon aria-hidden="true" className="size-3" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 overflow-y-auto">
            <SheetHeader className="border-b">
              <SheetTitle className="label-caps font-normal">
                Filtros
              </SheetTitle>
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

        <div className="relative flex items-center gap-1 label-caps">
          <label htmlFor={sortId}>Ordenar:</label>
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
            className="field-sizing-content h-9 cursor-pointer appearance-none bg-transparent pr-4 uppercase"
          >
            {Object.entries(SORT_OPTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none absolute right-0 size-3"
          />
        </div>
      </div>
    </div>
  );
}
