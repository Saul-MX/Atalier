import Link from "next/link";

import { Price } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { type ProductCardData } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

import { ProductImage } from "./product-image";

const CARD_SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

type ProductCardProps = {
  product: ProductCardData;
  headingLevel?: "h2" | "h3";
  preload?: boolean;
};

export function ProductCard({
  product,
  headingLevel: Heading = "h3",
  preload,
}: ProductCardProps) {
  const [mainImage, hoverImage] = product.images;

  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
        <ProductImage
          src={mainImage}
          alt={product.name}
          sizes={CARD_SIZES}
          preload={preload}
          className={cn(
            "transition duration-500 ease-out group-hover:scale-[1.02]",
            hoverImage && "group-focus-within:opacity-0 group-hover:opacity-0",
            !product.inStock && "opacity-70",
          )}
        />
        {hoverImage && (
          <ProductImage
            src={hoverImage}
            alt=""
            sizes={CARD_SIZES}
            className="opacity-0 transition duration-500 ease-out group-focus-within:opacity-100 group-hover:scale-[1.02] group-hover:opacity-100"
          />
        )}
        {!product.inStock && (
          <Badge variant="secondary" className="absolute top-2 left-2">
            Agotado
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Heading className="text-sm leading-snug font-medium">
          {/* El enlace cubre toda la tarjeta (::after) sin anidar elementos interactivos. */}
          <Link
            href={`/producto/${product.slug}`}
            className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
          >
            {product.name}
          </Link>
        </Heading>
        <p className="text-sm text-muted-foreground">
          <Price cents={product.price} />
        </p>
        {product.colors.length > 0 && (
          <ul className="mt-1 flex items-center gap-1.5">
            {product.colors.map((color) => (
              <li key={color.name}>
                <span
                  className="block size-3 rounded-full border border-foreground/20"
                  style={{ backgroundColor: color.hex ?? undefined }}
                  title={color.name}
                  aria-hidden="true"
                />
                <span className="sr-only">{color.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
