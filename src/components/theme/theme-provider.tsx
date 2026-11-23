"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Tema claro/oscuro con la clase `.dark` en <html> (ver globals.css). Sigue al
 * sistema hasta que el visitante elige uno; la elección se guarda en
 * localStorage y un script en línea la aplica antes de pintar (sin parpadeo).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
