"use client";

import { ChevronLeftIcon, ChevronRightIcon, ZoomInIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type GalleryImage = { id: string; url: string };

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const current = images[index];
  const total = images.length;

  if (!current) {
    return (
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
        <ProductImage
          src={null}
          alt={`${productName}: sin imagen`}
          sizes="50vw"
        />
      </div>
    );
  }

  const go = (delta: number) => setIndex((i) => (i + delta + total) % total);
  const alt = (i: number) =>
    total > 1 ? `${productName}, imagen ${i + 1} de ${total}` : productName;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[3/4] flex-1 overflow-hidden rounded-md bg-muted">
        <ProductImage
          src={current.url}
          alt={alt(index)}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority={index === 0}
        />
        <Button
          variant="secondary"
          size="icon-lg"
          className="absolute right-3 bottom-3 shadow-sm"
          onClick={() => setZoomOpen(true)}
          aria-label="Ampliar imagen"
          aria-haspopup="dialog"
        >
          <ZoomInIcon aria-hidden="true" />
        </Button>
      </div>

      {total > 1 && (
        <ul aria-label="Miniaturas" className="grid grid-cols-4 gap-3">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver imagen ${i + 1} de ${total}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative block aspect-[3/4] w-full overflow-hidden rounded-md border-2 border-transparent bg-muted",
                  i === index && "border-primary",
                )}
              >
                <ProductImage
                  src={image.url}
                  alt=""
                  sizes="(min-width: 1024px) 15vw, 25vw"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ZoomDialog
        open={zoomOpen}
        onOpenChange={setZoomOpen}
        src={current.url}
        alt={alt(index)}
        position={total > 1 ? `${index + 1} / ${total}` : undefined}
        onPrev={total > 1 ? () => go(-1) : undefined}
        onNext={total > 1 ? () => go(1) : undefined}
      />
    </div>
  );
}

function ZoomDialog({
  open,
  onOpenChange,
  src,
  alt,
  position,
  onPrev,
  onNext,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
  position?: string;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft" && onPrev) {
      setZoomed(false);
      onPrev();
    } else if (event.key === "ArrowRight" && onNext) {
      setZoomed(false);
      onNext();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) setZoomed(false);
      }}
    >
      <DialogContent
        className="max-h-[95vh] w-[95vw] max-w-3xl gap-3 p-3 sm:max-w-3xl"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="pr-10 text-sm">{alt}</DialogTitle>
        <DialogDescription className="sr-only">
          Pulsa la imagen o la tecla Intro para acercar o alejar.
          {onPrev &&
            " Usa las flechas izquierda y derecha para cambiar de imagen."}
        </DialogDescription>

        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          onPointerMove={zoomed ? onPointerMove : undefined}
          aria-label={zoomed ? "Alejar imagen" : "Acercar imagen"}
          aria-pressed={zoomed}
          className={cn(
            "relative mx-auto aspect-[3/4] max-h-[75vh] w-full overflow-hidden rounded-md bg-muted",
            zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
          )}
        >
          <Image
            src={src}
            alt=""
            fill
            sizes="(min-width: 768px) 768px, 95vw"
            className="object-contain transition-transform duration-200"
            style={{
              transform: zoomed ? "scale(2.2)" : "scale(1)",
              transformOrigin: origin,
            }}
          />
        </button>

        {onPrev && onNext && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setZoomed(false);
                onPrev();
              }}
            >
              <ChevronLeftIcon aria-hidden="true" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {position}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                setZoomed(false);
                onNext();
              }}
            >
              Siguiente
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
