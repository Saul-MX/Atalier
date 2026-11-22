"use client";

import { createContext, useContext, useState } from "react";

type ProductColorState = {
  color: string;
  setColor: (color: string) => void;
};

const ProductColorContext = createContext<ProductColorState | null>(null);

/**
 * Color elegido en la ficha, compartido por el selector de compra y la
 * galería (que muestra las fotos de ese color).
 */
export function ProductColorProvider({
  initialColor,
  children,
}: {
  initialColor: string;
  children: React.ReactNode;
}) {
  const [color, setColor] = useState(initialColor);
  return (
    <ProductColorContext value={{ color, setColor }}>
      {children}
    </ProductColorContext>
  );
}

/**
 * Color compartido; fuera del provider (p. ej. en tests) cada componente
 * guarda su propio estado partiendo de `fallback`.
 */
export function useProductColor(fallback: string): ProductColorState {
  const shared = useContext(ProductColorContext);
  const [color, setColor] = useState(fallback);
  return shared ?? { color, setColor };
}
