"use client";

import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Algo salió mal",
  description = "No pudimos cargar este contenido. Inténtalo de nuevo en unos segundos.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 px-6 py-16 text-center",
        className,
      )}
    >
      <AlertTriangleIcon
        className="size-8 text-destructive"
        aria-hidden="true"
      />
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          <RotateCcwIcon aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
