import { Skeleton } from "@/components/ui/skeleton";
import { type ProductCardData } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

import { ProductCard } from "./product-card";

const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6";

type ProductGridProps = {
  products: ProductCardData[];
  headingLevel?: "h2" | "h3";
  /** Prioriza las primeras N imágenes (las visibles sin hacer scroll en móvil). */
  priorityCount?: number;
  className?: string;
};

export function ProductGrid({
  products,
  headingLevel,
  priorityCount = 0,
  className,
}: ProductGridProps) {
  return (
    <ul className={cn(GRID, className)}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            headingLevel={headingLevel}
            priority={index < priorityCount}
          />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(GRID, className)}
      role="status"
      aria-label="Cargando productos"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="mx-auto h-4 w-3/4" />
          <Skeleton className="mx-auto h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
