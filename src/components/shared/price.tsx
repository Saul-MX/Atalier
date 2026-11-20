import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Muestra un importe en centavos como MXN. */
export function Price({
  cents,
  className,
}: {
  cents: number;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>{formatPrice(cents)}</span>
  );
}
