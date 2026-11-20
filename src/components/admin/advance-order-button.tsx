"use client";

import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { advanceOrderAction } from "@/app/admin/pedidos/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { type OrderStatus } from "@/generated/prisma/enums";
import {
  ADVANCE_LABEL,
  nextFulfillmentStatus,
  STATUS_LABEL,
} from "@/lib/orders/status";

/** PAID → SHIPPED → DELIVERED con confirmación. No se puede deshacer. */
export function AdvanceOrderButton({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const next = nextFulfillmentStatus(status);
  if (!next) return null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (pending) return;
        setOpen(value);
        if (value) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button>{ADVANCE_LABEL[status]}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ADVANCE_LABEL[status]}</AlertDialogTitle>
          <AlertDialogDescription>
            {`El pedido pasará de «${STATUS_LABEL[status]}» a «${STATUS_LABEL[next]}». El cliente lo verá en su historial y no se puede deshacer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await advanceOrderAction(orderId, status);
                if (result.ok) {
                  setOpen(false);
                  toast.success(result.message);
                } else {
                  setError(result.error);
                }
              })
            }
          >
            {pending && (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            )}
            Confirmar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
