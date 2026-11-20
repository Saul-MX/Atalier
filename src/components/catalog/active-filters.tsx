import { XIcon } from "lucide-react";
import Link from "next/link";

import {
  type CatalogFilters,
  catalogHref,
  withFilters,
} from "@/lib/catalog/filters";
import { type CatalogFacets } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/money";

type Chip = { label: string; href: string };

function buildChips(filters: CatalogFilters, facets: CatalogFacets): Chip[] {
  const chips: Chip[] = [];
  const href = (patch: Partial<CatalogFilters>) =>
    catalogHref(withFilters(filters, patch));

  if (filters.category) {
    const name =
      facets.categories.find((c) => c.slug === filters.category)?.name ??
      filters.category;
    chips.push({ label: name, href: href({ category: undefined }) });
  }
  if (filters.q) {
    chips.push({ label: `«${filters.q}»`, href: href({ q: undefined }) });
  }
  for (const color of filters.colors) {
    chips.push({
      label: color,
      href: href({ colors: filters.colors.filter((c) => c !== color) }),
    });
  }
  for (const size of filters.sizes) {
    chips.push({
      label: `Talla ${size}`,
      href: href({ sizes: filters.sizes.filter((s) => s !== size) }),
    });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const label =
      filters.minPrice !== undefined && filters.maxPrice !== undefined
        ? `${formatPrice(filters.minPrice)} – ${formatPrice(filters.maxPrice)}`
        : filters.minPrice !== undefined
          ? `Desde ${formatPrice(filters.minPrice)}`
          : `Hasta ${formatPrice(filters.maxPrice!)}`;
    chips.push({
      label,
      href: href({ minPrice: undefined, maxPrice: undefined }),
    });
  }
  return chips;
}

export function ActiveFilters({
  filters,
  facets,
}: {
  filters: CatalogFilters;
  facets: CatalogFacets;
}) {
  const chips = buildChips(filters, facets);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="sr-only">Filtros activos</h2>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.label}>
            <Link
              href={chip.href}
              scroll={false}
              className="flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs hover:border-foreground/40"
            >
              {chip.label}
              <XIcon className="size-3" aria-hidden="true" />
              <span className="sr-only">(quitar filtro)</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={catalogHref({ sort: filters.sort })}
        scroll={false}
        className="text-xs underline underline-offset-4"
      >
        Limpiar todo
      </Link>
    </div>
  );
}
