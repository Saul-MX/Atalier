import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { type CatalogFilters, catalogHref } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils";

const itemClass =
  "flex h-9 min-w-7 items-center justify-center gap-1 px-1 label-caps underline-offset-4 hover:underline";

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
    <nav aria-label="Paginación" className="flex justify-center pt-10">
      <ul className="flex flex-wrap items-center gap-3">
        <li>
          {current > 1 ? (
            <Link href={href(current - 1)} className={itemClass}>
              <ArrowLeftIcon className="size-3" aria-hidden="true" />
              Anterior
            </Link>
          ) : (
            <span
              className={cn(itemClass, "pointer-events-none opacity-40")}
              aria-disabled="true"
            >
              <ArrowLeftIcon className="size-3" aria-hidden="true" />
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
                page === current ? "underline" : "text-muted-foreground",
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
              <ArrowRightIcon className="size-3" aria-hidden="true" />
            </Link>
          ) : (
            <span
              className={cn(itemClass, "pointer-events-none opacity-40")}
              aria-disabled="true"
            >
              Siguiente
              <ArrowRightIcon className="size-3" aria-hidden="true" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
