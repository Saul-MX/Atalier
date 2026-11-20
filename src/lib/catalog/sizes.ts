/** Orden canónico de tallas para mostrarlas siempre igual. */
export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "Única"] as const;

function rank(size: string): number {
  return (SIZE_ORDER as readonly string[]).indexOf(size);
}

export function compareSizes(a: string, b: string): number {
  const ia = rank(a);
  const ib = rank(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b, "es");
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
