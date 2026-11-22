"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ImagePlusIcon,
  Loader2Icon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  attachImagesAction,
  deleteImageAction,
  getUploadSignatureAction,
  moveImageAction,
  setImageColorAction,
} from "@/app/admin/productos/actions";
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
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PRODUCT_IMAGES,
  rejectFile,
} from "@/lib/catalog/product-images";
import { cn } from "@/lib/utils";

import {
  type CloudinaryUpload,
  uploadToCloudinary,
} from "./upload-to-cloudinary";

type ManagedImage = {
  id: string;
  url: string;
  isPlaceholder: boolean;
  color: string | null;
};

type QueueItem = {
  key: string;
  name: string;
  progress: number;
  error?: string;
};

type ImageManagerProps = {
  productId: string;
  productName: string;
  images: ManagedImage[];
  /** Colores de las variantes, para asignar cada foto a uno. */
  colors: string[];
};

/**
 * Fotos del producto: subida múltiple con drag-and-drop directa a Cloudinary
 * (firma del servidor), orden con botones (accesible por teclado), color de
 * variante y borrado. La primera foto es la principal.
 */
export function ImageManager({
  productId,
  productName,
  images,
  colors,
}: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const pickerRef = useRef<HTMLButtonElement>(null);
  const focusAfterUpdate = useRef<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();

  const realCount = images.filter((image) => !image.isPlaceholder).length;
  const remaining = MAX_PRODUCT_IMAGES - realCount;
  const hasPlaceholders = images.some((image) => image.isPlaceholder);
  const busy = uploading || pending;

  // Al reordenar o borrar, React mueve/desmonta nodos y el foco se pierde:
  // se devuelve al control equivalente cuando llegan los datos nuevos.
  useEffect(() => {
    const target = focusAfterUpdate.current;
    if (target === null) return;
    focusAfterUpdate.current = null;
    const [imageId] = target.split(":");
    const list = listRef.current;
    const element =
      list?.querySelector<HTMLElement>(
        `[data-focus="${target}"]:not(:disabled)`,
      ) ??
      list?.querySelector<HTMLElement>(
        `[data-focus^="${imageId}:"]:not(:disabled)`,
      ) ??
      pickerRef.current;
    element?.focus();
  }, [images]);

  async function handleFiles(fileList: FileList | File[]) {
    const files = [...fileList];
    if (files.length === 0 || uploading) return;

    const rejected: QueueItem[] = [];
    const accepted: { key: string; file: File }[] = [];
    for (const file of files) {
      const key = crypto.randomUUID();
      const reason = rejectFile(file);
      if (reason)
        rejected.push({ key, name: file.name, progress: 0, error: reason });
      else if (accepted.length >= remaining)
        rejected.push({
          key,
          name: file.name,
          progress: 0,
          error: `Límite de ${MAX_PRODUCT_IMAGES} fotos por producto.`,
        });
      else accepted.push({ key, file });
    }

    setQueue([
      ...rejected,
      ...accepted.map(({ key, file }) => ({
        key,
        name: file.name,
        progress: 0,
      })),
    ]);
    if (accepted.length === 0) {
      setAnnouncement("Ningún archivo se pudo subir.");
      return;
    }

    setUploading(true);
    setAnnouncement(`Subiendo ${accepted.length} foto(s)…`);
    try {
      const signed = await getUploadSignatureAction(productId);
      if (!signed.ok) {
        toast.error(signed.error);
        setQueue((items) =>
          items.map((item) =>
            item.error
              ? item
              : { ...item, error: "No se pudo iniciar la subida." },
          ),
        );
        return;
      }

      const results = await Promise.allSettled(
        accepted.map(({ key, file }) =>
          uploadToCloudinary(file, signed.upload, (progress) =>
            setQueue((items) =>
              items.map((item) =>
                item.key === key ? { ...item, progress } : item,
              ),
            ),
          ),
        ),
      );

      const uploads: CloudinaryUpload[] = [];
      const failed = new Map<string, string>();
      results.forEach((result, index) => {
        const { key } = accepted[index]!;
        if (result.status === "fulfilled") uploads.push(result.value);
        else failed.set(key, (result.reason as Error).message);
      });

      if (uploads.length > 0) {
        const attached = await attachImagesAction(productId, uploads);
        if (!attached.ok) {
          toast.error(attached.error);
          for (const { key } of accepted) {
            if (!failed.has(key)) failed.set(key, "No se pudo guardar.");
          }
        } else {
          toast.success(
            attached.added === 1
              ? "Foto añadida."
              : `${attached.added} fotos añadidas.`,
          );
        }
      }

      // Solo quedan en la cola los archivos con error, para que se vea el motivo.
      setQueue((items) =>
        items
          .filter((item) => item.error || failed.has(item.key))
          .map((item) =>
            failed.has(item.key)
              ? { ...item, error: failed.get(item.key) }
              : item,
          ),
      );
      const added = accepted.filter(({ key }) => !failed.has(key)).length;
      const errored = failed.size + rejected.length;
      setAnnouncement(
        errored > 0
          ? `${added} foto(s) subidas, ${errored} con error.`
          : "Subida completada.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function runImageAction(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    focusTarget: string,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      focusAfterUpdate.current = focusTarget;
      setAnnouncement(success);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy && remaining > 0) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy && remaining > 0)
            void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
          dragging && "border-primary bg-muted",
          remaining <= 0 && "opacity-60",
        )}
      >
        <ImagePlusIcon
          className="size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm">
          {remaining > 0
            ? "Arrastra fotos aquí o elígelas desde tu equipo"
            : `Has alcanzado el máximo de ${MAX_PRODUCT_IMAGES} fotos`}
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP o AVIF · máx. 10 MB · {Math.max(remaining, 0)} hueco(s)
          libre(s)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
          }}
        />
        <Button
          ref={pickerRef}
          type="button"
          variant="outline"
          disabled={busy || remaining <= 0}
          onClick={() => inputRef.current?.click()}
        >
          {uploading && (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          )}
          {uploading ? "Subiendo…" : "Elegir fotos"}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {queue.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Archivos en subida">
          {queue.map((item) => (
            <li key={item.key} className="flex flex-col gap-1 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{item.name}</span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    item.error ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {item.error ?? `${Math.round(item.progress * 100)} %`}
                </span>
              </div>
              {!item.error && (
                <div
                  role="progressbar"
                  aria-label={`Subiendo ${item.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(item.progress * 100)}
                  className="h-1 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${item.progress * 100}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasPlaceholders && (
        <p className="text-xs text-muted-foreground">
          Las imágenes marcadas como «Provisional» son del seed: se retiran
          automáticamente al subir la primera foto real.
        </p>
      )}

      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {colors.length > 0
            ? "Asigna cada foto a su color: en la tienda, al elegir un color se muestran sus fotos, y la ficha abre en el color de la foto principal. «Todos los colores» sirve para detalles comunes."
            : "Cuando añadas colores en «Variantes y stock», podrás asignar cada foto a su color."}
        </p>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este producto aún no tiene fotos. En la tienda se mostrará un marcador
          vacío.
        </p>
      ) : (
        <ol
          ref={listRef}
          aria-label="Fotos del producto"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {images.map((image, index) => {
            const label = `Foto ${index + 1} de ${images.length}`;
            return (
              <li key={image.id} className="flex flex-col gap-2">
                <div className="relative aspect-3/4 overflow-hidden rounded-md bg-muted">
                  <ProductImage
                    src={image.url}
                    alt={`${productName}, ${label.toLowerCase()}`}
                    sizes="(min-width: 1024px) 15vw, (min-width: 640px) 30vw, 45vw"
                  />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {index === 0 && <Badge>Principal</Badge>}
                    {image.isPlaceholder && (
                      <Badge variant="secondary">Provisional</Badge>
                    )}
                  </div>
                </div>
                {colors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`image-color-${image.id}`}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      Color<span className="sr-only"> ({label})</span>
                    </label>
                    <select
                      id={`image-color-${image.id}`}
                      value={image.color ?? ""}
                      disabled={busy}
                      data-focus={`${image.id}:color`}
                      onChange={(event) => {
                        const color = event.target.value || null;
                        runImageAction(
                          () => setImageColorAction(image.id, color),
                          `${image.id}:color`,
                          color
                            ? `Foto asignada al color ${color}.`
                            : "Foto asignada a todos los colores.",
                        );
                      }}
                      className="h-8 min-w-0 flex-1 border border-input bg-background px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
                    >
                      <option value="">Todos los colores</option>
                      {colors.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy || index === 0}
                    data-focus={`${image.id}:up`}
                    aria-label={`Mover antes (${label})`}
                    onClick={() =>
                      runImageAction(
                        () => moveImageAction(image.id, "up"),
                        `${image.id}:up`,
                        `Foto movida a la posición ${index}.`,
                      )
                    }
                  >
                    <ArrowLeftIcon aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy || index === images.length - 1}
                    data-focus={`${image.id}:down`}
                    aria-label={`Mover después (${label})`}
                    onClick={() =>
                      runImageAction(
                        () => moveImageAction(image.id, "down"),
                        `${image.id}:down`,
                        `Foto movida a la posición ${index + 2}.`,
                      )
                    }
                  >
                    <ArrowRightIcon aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy || index === 0}
                    aria-label={`Hacer principal (${label})`}
                    onClick={() =>
                      runImageAction(
                        () => moveImageAction(image.id, "first"),
                        `${image.id}:down`,
                        "Foto marcada como principal.",
                      )
                    }
                  >
                    <StarIcon aria-hidden="true" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto text-destructive hover:text-destructive"
                        disabled={busy}
                        aria-label={`Eliminar (${label})`}
                      >
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Eliminar esta foto?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {image.isPlaceholder
                            ? "Se quitará la imagen provisional del producto."
                            : "Se borrará del producto y de Cloudinary. No se puede deshacer."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => {
                            const neighbour =
                              images[index + 1] ?? images[index - 1];
                            runImageAction(
                              () => deleteImageAction(image.id),
                              neighbour ? `${neighbour.id}:down` : "",
                              "Foto eliminada.",
                            );
                          }}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
