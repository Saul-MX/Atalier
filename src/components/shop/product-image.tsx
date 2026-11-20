import { ImageOffIcon } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string | null | undefined;
  /** Texto alternativo; usa "" si la imagen es decorativa. */
  alt: string;
  sizes: string;
  className?: string;
  preload?: boolean;
};

/**
 * Imagen de producto que rellena su contenedor (el padre debe ser `relative`
 * y tener proporción). Los SVG provisionales se sirven sin optimizar
 * (Next lo hace automáticamente para `.svg`).
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className,
  preload,
}: ProductImageProps) {
  if (!src) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOffIcon className="size-6" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={cn("object-cover", className)}
    />
  );
}
