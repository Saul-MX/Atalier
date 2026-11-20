import { PackageXIcon } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <Container className="py-16">
      <EmptyState
        icon={PackageXIcon}
        title="Producto no encontrado"
        description="Puede que ya no esté disponible o que el enlace sea incorrecto."
        headingLevel="h1"
        action={
          <Button asChild>
            <Link href="/catalogo">Ver el catálogo</Link>
          </Button>
        }
      />
    </Container>
  );
}
