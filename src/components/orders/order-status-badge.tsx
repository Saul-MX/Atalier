import {
  BanIcon,
  CircleCheckIcon,
  ClockIcon,
  CreditCardIcon,
  type LucideIcon,
  TimerOffIcon,
  TruckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { type OrderStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL } from "@/lib/orders/status";

const STYLE: Record<
  OrderStatus,
  { icon: LucideIcon; variant: "default" | "secondary" | "outline" }
> = {
  PENDING: { icon: ClockIcon, variant: "outline" },
  PAID: { icon: CreditCardIcon, variant: "default" },
  SHIPPED: { icon: TruckIcon, variant: "secondary" },
  DELIVERED: { icon: CircleCheckIcon, variant: "secondary" },
  CANCELLED: { icon: BanIcon, variant: "outline" },
  EXPIRED: { icon: TimerOffIcon, variant: "outline" },
};

/** Estado del pedido: siempre icono + texto (nunca solo color). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { icon: Icon, variant } = STYLE[status];
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
