import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { type CatalogFilters, catalogHref } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils";

const itemClass =
  "flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border px-3 text-sm hover:bg-muted";

export function Pagination({
  filters,
  pageCount,
}: {
  filters: CatalogFilters;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const current = Math.min(filters.page, pageCount);
  const href = (page: number) => catalogHref({ ...filters, page });
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <nav aria-label="Paginación" className="flex justify-center">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          {current > 1 ? (
            <Link href={href(current - 1)} className={itemClass}>
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
              Anterior
            </Link>
          ) : (
            <span
              className={cn(itemClass, "pointer-events-none opacity-40")}
              aria-disabled="true"
            >
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
              Anterior
            </span>
          )}
        </li>
        {pages.map((page) => (
          <li key={page}>
            <Link
              href={href(page)}
              aria-current={page === current ? "page" : undefined}
              aria-label={`Página ${page}`}
              className={cn(
                itemClass,
                page === current &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {page}
            </Link>
          </li>
        ))}
        <li>
          {current < pageCount ? (
            <Link href={href(current + 1)} className={itemClass}>
              Siguiente
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span
              className={cn(itemClass, "pointer-events-none opacity-40")}
              aria-disabled="true"
            >
              Siguiente
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
