"use client";

import { useEffect } from "react";

import { Container } from "@/components/shared/container";
import { ErrorState } from "@/components/shared/error-state";

export default function ShopError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-16">
      <ErrorState
        title="No pudimos cargar esta página"
        description="Puede ser un problema temporal de conexión. Vuelve a intentarlo."
        onRetry={retry}
      />
    </Container>
  );
}
