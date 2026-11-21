"use client";

import Link from "next/link";
import { useId, useOptimistic, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CatalogFilters as Filters,
  catalogHref,
  toggleValue,
  withFilters,
} from "@/lib/catalog/filters-url";
import { type CatalogFacets } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

import { useCatalogNavigation } from "./catalog-navigation";

type CatalogFiltersProps = {
  filters: Filters;
  facets: CatalogFacets;
  onNavigate?: () => void;
};

export function CatalogFilters({
  filters: serverFilters,
  facets,
  onNavigate,
}: CatalogFiltersProps) {
  const { navigate, isPending } = useCatalogNavigation();
  const id = useId();
  // Las casillas reflejan el cambio al instante mientras llega la nueva página.
  const [filters, setOptimisticFilters] = useOptimistic(serverFilters);

  const apply = (patch: Partial<Filters>) => {
    const next = withFilters(filters, patch);
    navigate(next, () => setOptimisticFilters(next));
  };

  return (
    <div className="flex flex-col gap-8" aria-busy={isPending}>
      {/* Categoría: selección única con enlaces (rastreables por buscadores) */}
      <nav aria-labelledby={`${id}-cat`}>
        <h3 id={`${id}-cat`} className="mb-3 text-sm font-medium">
          Categoría
        </h3>
        <ul className="flex flex-col gap-1 text-sm">
          <li>
            <CategoryLink
              href={catalogHref(withFilters(filters, { category: undefined }))}
              active={!filters.category}
              onNavigate={onNavigate}
            >
              Todas
            </CategoryLink>
          </li>
          {facets.categories.map((category) => (
            <li key={category.slug}>
              <CategoryLink
                href={catalogHref(
                  withFilters(filters, { category: category.slug }),
                )}
                active={filters.category === category.slug}
                onNavigate={onNavigate}
              >
                {category.name}
              </CategoryLink>
            </li>
          ))}
        </ul>
      </nav>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Color</legend>
        <ul className="grid grid-cols-2 gap-2">
          {facets.colors.map((color) => {
            const checked = filters.colors.includes(color.name);
            const inputId = `${id}-color-${color.name}`;
            return (
              <li key={color.name} className="flex items-center gap-2">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    apply({ colors: toggleValue(filters.colors, color.name) })
                  }
                  className="size-4 accent-primary"
                />
                <label
                  htmlFor={inputId}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="size-3.5 rounded-full border border-foreground/20"
                    style={{ backgroundColor: color.hex ?? undefined }}
                  />
                  {color.name}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Talla disponible</legend>
        <ul className="flex flex-wrap gap-2">
          {facets.sizes.map((size) => {
            const checked = filters.sizes.includes(size);
            const inputId = `${id}-size-${size}`;
            return (
              <li key={size}>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    apply({ sizes: toggleValue(filters.sizes, size) })
                  }
                  className="peer sr-only"
                />
                <label
                  htmlFor={inputId}
                  className="flex h-9 min-w-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:border-foreground/50"
                >
                  {size}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <PriceFilter
        key={`${filters.minPrice}-${filters.maxPrice}`}
        filters={filters}
        facets={facets}
        onApply={(minPrice, maxPrice) => {
          apply({ minPrice, maxPrice });
          onNavigate?.();
        }}
      />
    </div>
  );
}

function CategoryLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-md px-2 py-1.5 hover:bg-muted",
        active && "bg-muted font-medium",
      )}
    >
      {children}
    </Link>
  );
}

function PriceFilter({
  filters,
  facets,
  onApply,
}: {
  filters: Filters;
  facets: CatalogFacets;
  onApply: (min?: number, max?: number) => void;
}) {
  const id = useId();
  const toPesos = (cents?: number) =>
    cents === undefined ? "" : String(Math.floor(cents / 100));
  const [min, setMin] = useState(toPesos(filters.minPrice));
  const [max, setMax] = useState(toPesos(filters.maxPrice));
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const minValue = min === "" ? undefined : Number(min);
    const maxValue = max === "" ? undefined : Number(max);
    const invalid = [minValue, maxValue].some(
      (v) => v !== undefined && (!Number.isInteger(v) || v < 0),
    );
    if (invalid) {
      setError("Introduce importes enteros en pesos.");
      return;
    }
    if (
      minValue !== undefined &&
      maxValue !== undefined &&
      minValue > maxValue
    ) {
      setError("El mínimo no puede ser mayor que el máximo.");
      return;
    }
    setError(null);
    onApply(
      minValue === undefined ? undefined : minValue * 100,
      maxValue === undefined ? undefined : maxValue * 100,
    );
  };

  const errorId = `${id}-error`;
  const placeholderMin = String(Math.floor(facets.priceRange.min / 100));
  const placeholderMax = String(Math.ceil(facets.priceRange.max / 100));

  return (
    <form onSubmit={submit} noValidate>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Precio (MXN)</legend>
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={`${id}-min`} className="text-xs">
              Mínimo
            </Label>
            <Input
              id={`${id}-min`}
              inputMode="numeric"
              value={min}
              onChange={(event) => setMin(event.target.value.trim())}
              placeholder={placeholderMin}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={`${id}-max`} className="text-xs">
              Máximo
            </Label>
            <Input
              id={`${id}-max`}
              inputMode="numeric"
              value={max}
              onChange={(event) => setMax(event.target.value.trim())}
              placeholder={placeholderMax}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-2 text-xs text-destructive"
          >
            {error}
          </p>
        )}
        <Button type="submit" variant="outline" className="mt-3 w-full">
          Aplicar precio
        </Button>
      </fieldset>
    </form>
  );
}
