import { Badge } from "@/components/ui/badge";
import { type OrderStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

/**
 * Relleno negro = en curso; contorno = entregado; tenue = sin efecto.
 * El estado siempre se lee en el texto (nunca solo por el estilo).
 */
const STYLE: Record<OrderStatus, string> = {
  PENDING: "border-border text-muted-foreground",
  PAID: "border-primary bg-primary text-primary-foreground",
  SHIPPED: "border-primary bg-primary text-primary-foreground",
  DELIVERED: "border-foreground text-foreground",
  CANCELLED: "border-border text-muted-foreground",
  EXPIRED: "border-border text-muted-foreground",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 px-2.5 text-[0.625rem] font-normal tracking-[0.12em] uppercase",
        STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
