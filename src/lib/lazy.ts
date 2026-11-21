import { type ComponentType, lazy } from "react";

/**
 * `React.lazy` con precarga: el código del componente (p. ej. un diálogo de
 * Radix) no viaja en el JS inicial; se descarga al abrirlo por primera vez o
 * antes, al pasar el puntero o enfocar su botón (`preload()`).
 */
export function lazyWithPreload<P extends object>(
  loader: () => Promise<ComponentType<P>>,
) {
  let promise: Promise<ComponentType<P>> | undefined;
  const preload = () => (promise ??= loader());
  const Component = lazy(async () => ({ default: await preload() }));
  return Object.assign(Component, { preload });
}
