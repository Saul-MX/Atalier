"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useDarkMode } from "./use-dark-mode";

/**
 * Botón de alternancia del modo oscuro (`aria-pressed`). El icono depende de
 * la clase `.dark`, así que es correcto desde la primera pintura.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, setDark } = useDarkMode();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Modo oscuro"
      aria-pressed={isDark}
      title={isDark ? "Volver al modo claro" : "Activar el modo oscuro"}
      onClick={() => setDark(!isDark)}
      className={className}
    >
      <MoonIcon aria-hidden="true" className="dark:hidden" />
      <SunIcon aria-hidden="true" className="hidden dark:block" />
    </Button>
  );
}
