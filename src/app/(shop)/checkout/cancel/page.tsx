import { CircleXIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";

import { OpenCartButton } from "@/components/checkout/open-cart-button";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pago cancelado",
  robots: { index: false, follow: false },
};

/** Stripe vuelve aquí si el cliente cancela. El carrito no se toca. */
export default function CheckoutCancelPage() {
  return (
    <Container className="max-w-2xl py-12">
      <EmptyState
        icon={CircleXIcon}
        headingLevel="h1"
        title="Pago cancelado"
        description="No se realizó ningún cargo. Tu carrito sigue guardado para cuando quieras terminar la compra."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <OpenCartButton />
            <Button asChild variant="outline">
              <Link href="/catalogo">Seguir comprando</Link>
            </Button>
          </div>
        }
      />
    </Container>
  );
}
