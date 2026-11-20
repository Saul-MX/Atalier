import { TruckIcon } from "lucide-react";

import { Price } from "@/components/shared/price";
import { freeShippingProgress } from "@/lib/shipping";
import { cn } from "@/lib/utils";

export function FreeShippingBar({
  subtotal,
  className,
}: {
  subtotal: number;
  className?: string;
}) {
  const { qualifies, remaining, percent } = freeShippingProgress(subtotal);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="flex items-center gap-2 text-sm" aria-live="polite">
        <TruckIcon className="size-4 shrink-0" aria-hidden="true" />
        {qualifies ? (
          <span className="font-medium">¡Tu pedido tiene envío gratis!</span>
        ) : (
          <span>
            Te faltan <Price cents={remaining} className="font-medium" /> para
            el envío gratis
          </span>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progreso hacia el envío gratis"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent} %`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-500 ease-out",
            qualifies && "bg-success",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
