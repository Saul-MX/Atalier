"use client";

import { ImagePlusIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getSiteUploadSignatureAction,
  removeSiteImageAction,
  saveSiteImageAction,
} from "@/app/admin/portada/actions";
import { ProductImage } from "@/components/shop/product-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES, rejectFile } from "@/lib/catalog/product-images";
import { cn } from "@/lib/utils";
import { type SiteImageTarget } from "@/server/validators/site";

import { uploadToCloudinary } from "./upload-to-cloudinary";

type SiteImageEditorProps = {
  target: SiteImageTarget;
  /** Para los nombres accesibles: «del hero», «de Mujer». */
  label: string;
  image: string | null;
  /** Lo que se muestra sin imagen propia (p. ej. la foto de un producto). */
  fallback?: string | null;
  fallbackText: string;
  shape: "wide" | "card";
  hint: string;
  removeDescription: string;
};

/**
 * Una imagen editable de la portada: vista previa, subir/cambiar (directo a
 * Cloudinary con firma del servidor) y quitar.
 */
export function SiteImageEditor({
  target,
  label,
  image,
  fallback = null,
  fallbackText,
  shape,
  hint,
  removeDescription,
}: SiteImageEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = progress !== null || pending;

  async function upload(file: File) {
    const reason = rejectFile(file);
    if (reason) {
      toast.error(`${file.name}: ${reason}`);
      return;
    }
    setProgress(0);
    try {
      const signed = await getSiteUploadSignatureAction(target);
      if (!signed.ok) {
        toast.error(signed.error);
        return;
      }
      const uploaded = await uploadToCloudinary(
        file,
        signed.upload,
        setProgress,
      );
      const saved = await saveSiteImageAction(target, uploaded);
      if (saved.ok) toast.success(`Imagen ${label} actualizada.`);
      else toast.error(saved.error);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove() {
    startTransition(async () => {
      const result = await removeSiteImageAction(target);
      if (result.ok) toast.success(`Imagen ${label} quitada.`);
      else toast.error(result.error);
    });
  }

  const shown = image ?? fallback;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "relative overflow-hidden border bg-muted",
          shape === "wide" ? "aspect-video" : "aspect-3/4",
        )}
      >
        <ProductImage
          src={shown}
          alt={shown ? `Vista previa de la imagen ${label}` : ""}
          sizes={
            shape === "wide"
              ? "(min-width: 1024px) 60vw, 100vw"
              : "(min-width: 1024px) 20vw, 45vw"
          }
        />
        <Badge
          variant={image ? "default" : "outline"}
          className={cn("absolute top-2 left-2", !image && "bg-background")}
        >
          {image ? "Imagen propia" : fallbackText}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {progress !== null ? (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlusIcon aria-hidden="true" />
          )}
          {progress !== null
            ? `Subiendo… ${Math.round(progress * 100)} %`
            : image
              ? "Cambiar imagen"
              : "Subir imagen"}
          <span className="sr-only"> {label}</span>
        </Button>
        {image && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="text-destructive hover:text-destructive"
              >
                <Trash2Icon aria-hidden="true" />
                Quitar
                <span className="sr-only"> la imagen {label}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Quitar la imagen {label}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {removeDescription} Se borrará de Cloudinary.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove}>
                  Quitar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {hint} JPG, PNG, WebP o AVIF · máx. 10 MB.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
