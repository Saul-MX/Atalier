"use client";

import {
  CheckIcon,
  ImagePlusIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  attachImagesAction,
  getUploadSignatureAction,
  renameColorAction,
  saveVariantsAction,
} from "@/app/admin/productos/actions";
import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACCEPTED_IMAGE_TYPES, rejectFile } from "@/lib/catalog/product-images";
import { SIZE_ORDER } from "@/lib/catalog/sizes";
import {
  cellKey,
  type MatrixInput,
  matrixFromVariants,
} from "@/lib/catalog/variant-matrix";
import { cn } from "@/lib/utils";

import { uploadToCloudinary } from "./upload-to-cloudinary";

type VariantMatrixProps = {
  productId: string;
  variants: {
    color: string;
    colorHex: string | null;
    size: string;
    stock: number;
  }[];
  /** Primera foto asignada a cada color (nombre → URL). */
  colorPhotos: Record<string, string>;
};

type ColorRow = { key: string; name: string; hex: string; saved: boolean };

const STOCK_PATTERN = /^\d{1,4}$/;

/** Clave fija (no aleatoria: se renderiza también en el servidor). */
const FIRST_COLOR_KEY = "new-first";

/**
 * Filas iniciales: los colores guardados o, si el producto aún no tiene
 * ninguno, una fila vacía para escribir su color (basta con uno).
 */
function startingRows(saved: { name: string; hex: string }[]): ColorRow[] {
  if (saved.length === 0)
    return [{ key: FIRST_COLOR_KEY, name: "", hex: "#888888", saved: false }];
  return saved.map((c) => ({ ...c, key: c.name, saved: true }));
}

/**
 * Matriz talla × color con el stock de cada variante. Cada combinación de
 * colores y tallas elegidos es una variante. El servidor solo escribe las
 * celdas que cambiaste y detecta si una venta modificó el stock mientras
 * editabas (ver planVariantChanges).
 *
 * Cada color guardado tiene su botón «Añadir foto»: la foto se sube a
 * Cloudinary ya asignada a ese color.
 *
 * El padre la remonta (prop `key`) cuando cambian los datos del servidor.
 */
export function VariantMatrix({
  productId,
  variants,
  colorPhotos,
}: VariantMatrixProps) {
  const errorRef = useRef<HTMLParagraphElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoColor = useRef<string | null>(null);
  const [uploadingColor, setUploadingColor] = useState<string | null>(null);
  const initial = useMemo(() => matrixFromVariants(variants), [variants]);
  // Stock que vio el admin al cargar: base de la escritura condicional.
  const expected = useMemo(
    () =>
      new Map(initial.cells.map((c) => [cellKey(c.color, c.size), c.stock])),
    [initial],
  );

  const [colors, setColors] = useState<ColorRow[]>(() =>
    startingRows(initial.colors),
  );
  const [sizes, setSizes] = useState<string[]>(initial.sizes);
  const [stock, setStock] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initial.cells.map((c) => [cellKey(c.color, c.size), String(c.stock)]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Las celdas se indexan por la clave estable de la fila de color (el nombre
  // de un color nuevo puede cambiar mientras se escribe).
  const stockKey = (row: ColorRow, size: string) => cellKey(row.key, size);
  const stockValue = (row: ColorRow, size: string) =>
    stock[stockKey(row, size)] ?? "0";

  const toInput = (): MatrixInput => ({
    colors: colors.map((row) => ({ name: row.name.trim(), hex: row.hex })),
    sizes,
    cells: colors.flatMap((row) =>
      sizes.map((size) => ({
        color: row.name.trim(),
        size,
        stock: Number(stockValue(row, size) || "0"),
        expected: expected.get(cellKey(row.name.trim(), size)) ?? null,
      })),
    ),
  });

  const serialize = (input: MatrixInput) =>
    JSON.stringify({
      colors: input.colors,
      sizes: input.sizes,
      cells: input.cells
        .map((c) => [c.color, c.size, c.stock] as const)
        .sort((a, b) => cellKey(a[0], a[1]).localeCompare(cellKey(b[0], b[1]))),
    });
  // La fila vacía con la que arranca un producto sin colores no cuenta como
  // cambio hasta que se escribe algo en ella.
  const untouchedStart =
    initial.colors.length === 0 &&
    colors.length === 1 &&
    colors[0]!.key === FIRST_COLOR_KEY &&
    !colors[0]!.name.trim() &&
    sizes.every((size) => (Number(stockValue(colors[0]!, size)) || 0) === 0);
  const dirty = !untouchedStart && serialize(toInput()) !== serialize(initial);

  const invalidCells = colors.flatMap((row) =>
    sizes.filter((size) => !STOCK_PATTERN.test(stockValue(row, size))),
  );

  function toggleSize(size: string) {
    setSizes((current) => {
      if (current.includes(size)) return current.filter((s) => s !== size);
      // «Única» no se combina con tallas de ropa.
      const base = size === "Única" ? [] : current.filter((s) => s !== "Única");
      return [...base, size].sort(
        (a, b) =>
          (SIZE_ORDER as readonly string[]).indexOf(a) -
          (SIZE_ORDER as readonly string[]).indexOf(b),
      );
    });
  }

  function addColor() {
    const key = `new-${crypto.randomUUID()}`;
    setColors((rows) => [
      ...rows,
      { key, name: "", hex: "#888888", saved: false },
    ]);
    requestAnimationFrame(() =>
      tableRef.current
        ?.querySelector<HTMLInputElement>(`[data-color-name="${key}"]`)
        ?.focus(),
    );
  }

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  function save() {
    if (colors.some((row) => !row.name.trim())) {
      showError("Cada color necesita un nombre.");
      return;
    }
    if (invalidCells.length > 0) {
      showError("El stock debe ser un número entero entre 0 y 9999.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveVariantsAction(productId, toInput());
      if (result.ok) toast.success(result.message);
      else showError(result.error);
    });
  }

  /** Renombra un color guardado (variantes y fotos). Devuelve si se guardó. */
  async function renameSavedColor(from: string, to: string) {
    if (dirty) {
      showError(
        "Guarda o descarta los cambios de stock antes de renombrar un color.",
      );
      return false;
    }
    const result = await renameColorAction(productId, from, to);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(`Color renombrado a «${to.trim()}».`);
    return true;
  }

  function pickPhoto(color: string) {
    photoColor.current = color;
    fileRef.current?.click();
  }

  async function uploadPhotos(fileList: FileList) {
    const color = photoColor.current;
    const files = [...fileList].filter((file) => {
      const reason = rejectFile(file);
      if (reason) toast.error(`${file.name}: ${reason}`);
      return !reason;
    });
    if (!color || files.length === 0) return;

    setUploadingColor(color);
    try {
      const signed = await getUploadSignatureAction(productId);
      if (!signed.ok) {
        toast.error(signed.error);
        return;
      }
      const results = await Promise.allSettled(
        files.map((file) => uploadToCloudinary(file, signed.upload, () => {})),
      );
      const uploads = results.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      );
      for (const r of results) {
        if (r.status === "rejected") toast.error((r.reason as Error).message);
      }
      if (uploads.length === 0) return;

      const attached = await attachImagesAction(productId, uploads, color);
      if (attached.ok)
        toast.success(
          attached.added === 1
            ? `Foto añadida al color ${color}.`
            : `${attached.added} fotos añadidas al color ${color}.`,
        );
      else toast.error(attached.error);
    } finally {
      setUploadingColor(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function reset() {
    setColors(startingRows(initial.colors));
    setSizes(initial.sizes);
    setStock(
      Object.fromEntries(
        initial.cells.map((c) => [cellKey(c.color, c.size), String(c.stock)]),
      ),
    );
    setError(null);
  }

  const rowTotal = (row: ColorRow) =>
    sizes.reduce((sum, size) => sum + (Number(stockValue(row, size)) || 0), 0);
  const grandTotal = colors.reduce((sum, row) => sum + rowTotal(row), 0);

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Tallas</legend>
        <div className="flex flex-wrap gap-2">
          {SIZE_ORDER.map((size) => {
            const on = sizes.includes(size);
            return (
              <Button
                key={size}
                type="button"
                variant={on ? "default" : "outline"}
                size="sm"
                aria-pressed={on}
                onClick={() => toggleSize(size)}
                className="min-w-12"
              >
                {size}
              </Button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {initial.colors.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Elige las tallas, escribe el color de este producto y el stock de cada
          talla. Basta con un color; si vendes otro color como producto aparte,
          enlázalos con el mismo «Modelo».
        </p>
      )}

      {colors.length === 0 || sizes.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {colors.length === 0
            ? "Añade un color para crear variantes."
            : "Elige al menos una talla."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table ref={tableRef} className="w-full text-sm">
            <caption className="sr-only">
              Stock por color y talla. Cada celda es una variante.
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Color
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  Foto
                </th>
                {sizes.map((size) => (
                  <th key={size} scope="col" className="px-2 py-2 font-medium">
                    {size}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="w-10 px-2 py-2">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {colors.map((row) => {
                const label = row.name.trim() || "Color nuevo";
                return (
                  <tr key={row.key} className="border-t">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={row.hex}
                          aria-label={`Muestra de color de ${label}`}
                          onChange={(event) =>
                            setColors((rows) =>
                              rows.map((r) =>
                                r.key === row.key
                                  ? { ...r, hex: event.target.value }
                                  : r,
                              ),
                            )
                          }
                          className="size-8 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
                        />
                        {row.saved ? (
                          <SavedColorName
                            name={row.name}
                            onRename={(to) => renameSavedColor(row.name, to)}
                          />
                        ) : (
                          <Input
                            data-color-name={row.key}
                            aria-label="Nombre del color nuevo"
                            placeholder="Ej.: Washed Black"
                            maxLength={40}
                            value={row.name}
                            onChange={(event) =>
                              setColors((rows) =>
                                rows.map((r) =>
                                  r.key === row.key
                                    ? { ...r, name: event.target.value }
                                    : r,
                                ),
                              )
                            }
                            className="h-8 min-w-28"
                          />
                        )}
                      </div>
                    </th>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-12 w-9 shrink-0 overflow-hidden bg-muted">
                          {row.saved && colorPhotos[row.name] && (
                            <ProductImage
                              src={colorPhotos[row.name]!}
                              alt={`Foto del color ${label}`}
                              sizes="36px"
                            />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!row.saved || uploadingColor !== null}
                          onClick={() => pickPhoto(row.name)}
                          className="whitespace-nowrap"
                        >
                          {uploadingColor === row.name ? (
                            <Loader2Icon
                              className="animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <ImagePlusIcon aria-hidden="true" />
                          )}
                          {uploadingColor === row.name
                            ? "Subiendo…"
                            : "Añadir foto"}
                          <span className="sr-only"> de {label}</span>
                        </Button>
                      </div>
                    </td>
                    {sizes.map((size) => {
                      const value = stockValue(row, size);
                      const invalid = !STOCK_PATTERN.test(value);
                      return (
                        <td key={size} className="px-2 py-2 text-center">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={9999}
                            step={1}
                            value={value}
                            aria-label={`Stock de ${label}, talla ${size}`}
                            aria-invalid={invalid || undefined}
                            onChange={(event) =>
                              setStock((current) => ({
                                ...current,
                                [stockKey(row, size)]: event.target.value,
                              }))
                            }
                            className={cn(
                              "mx-auto h-8 w-20 text-center tabular-nums",
                              value === "0" && "text-muted-foreground",
                            )}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right tabular-nums">
                      {rowTotal(row)}
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Quitar el color ${label}`}
                        onClick={() =>
                          setColors((rows) =>
                            rows.filter((r) => r.key !== row.key),
                          )
                        }
                      >
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t bg-muted/30">
              <tr>
                <th
                  scope="row"
                  colSpan={sizes.length + 2}
                  className="px-3 py-2 text-left font-medium"
                >
                  {colors.length * sizes.length} variante(s)
                </th>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {grandTotal}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          if (event.target.files) void uploadPhotos(event.target.files);
        }}
      />
      {colors.some((row) => !row.saved) && (
        <p className="text-xs text-muted-foreground">
          Escribe el nombre del color nuevo y guarda las variantes; después
          podrás añadir su foto.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={addColor}
          disabled={pending}
        >
          <PlusIcon aria-hidden="true" />
          Añadir color
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {dirty ? "Cambios sin guardar" : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            disabled={!dirty || pending}
          >
            Descartar
          </Button>
          <Button type="button" onClick={save} disabled={!dirty || pending}>
            {pending && (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            )}
            Guardar variantes
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Nombre de un color guardado, con edición en línea para renombrarlo. */
function SavedColorName({
  name,
  onRename,
}: {
  name: string;
  onRename: (to: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const close = () => {
    setEditing(false);
    requestAnimationFrame(() => editRef.current?.focus());
  };

  if (!editing) {
    return (
      <span className="flex min-w-28 items-center gap-1">
        <span className="font-medium">{name}</span>
        <Button
          ref={editRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Renombrar el color ${name}`}
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
        >
          <PencilIcon aria-hidden="true" />
        </Button>
      </span>
    );
  }

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        const saved = await onRename(value);
        setSaving(false);
        if (saved) setEditing(false);
      }}
    >
      <Input
        ref={inputRef}
        aria-label={`Nuevo nombre del color ${name}`}
        maxLength={40}
        value={value}
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
        className="h-8 min-w-28"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        aria-label="Guardar nombre"
        disabled={saving || !value.trim()}
      >
        {saving ? (
          <Loader2Icon className="animate-spin" aria-hidden="true" />
        ) : (
          <CheckIcon aria-hidden="true" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Cancelar"
        disabled={saving}
        onClick={close}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </form>
  );
}
