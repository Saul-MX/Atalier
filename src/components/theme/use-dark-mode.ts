"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Estado del modo oscuro. En el servidor (y en la primera pintura del
 * cliente) el tema aún no se conoce: `isDark` es `undefined` para no
 * desajustar la hidratación; los iconos se alternan con la variante `dark:`.
 */
export function useDarkMode() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const isDark = mounted ? resolvedTheme === "dark" : undefined;
  return {
    isDark,
    setDark: (dark: boolean) => setTheme(dark ? "dark" : "light"),
  };
}
