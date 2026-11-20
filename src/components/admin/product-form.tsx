"use client";

import { Loader2Icon } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import {
  saveProductAction,
  type ProductFormState,
} from "@/app/admin/productos/actions";
import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/catalog/slug";
import { centsToInput } from "@/lib/money";

export type ProductFormValues = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string;
  active: boolean;
};

type ProductFormProps = {
  product?: ProductFormValues;
  categories: { id: string; name: string }[];
};

const errorText = "text-xs text-destructive";

/**
 * Alta y edición de producto. Los campos son controlados para no perder lo
 * escrito si el servidor devuelve errores. La validación real es la del
 * servidor (Zod): aquí solo se pintan sus mensajes.
 */
export function ProductForm({ product, categories }: ProductFormProps) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ProductFormState,
    FormData
  >(saveProductAction, null);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  // En el alta, el slug sigue al nombre hasta que el admin lo edita a mano.
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(
    product ? centsToInput(product.price) : "",
  );
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [active, setActive] = useState(product?.active ?? false);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      return;
    }
    const firstInvalid = Object.keys(state.fieldErrors ?? {})[0];
    const field = firstInvalid
      ? formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
      : null;
    if (field) field.focus();
    else toast.error(state.error);
  }, [state]);

  const errorIdFor = (field: string) =>
    errors[field] ? `${id}-${field}-error` : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-5"
    >
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id={`${id}-name`}
          name="name"
          label="Nombre"
          required
          maxLength={120}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
          error={errors.name}
        />
        <FormField
          id={`${id}-slug`}
          name="slug"
          label="Slug (URL)"
          maxLength={120}
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          hint={`/producto/${slug || "…"}`}
          error={errors.slug}
          spellCheck={false}
          autoCapitalize="none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-description`}>Descripción</Label>
        <Textarea
          id={`${id}-description`}
          name="description"
          required
          rows={5}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errorIdFor("description")}
        />
        {errors.description && (
          <p id={`${id}-description-error`} className={errorText}>
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id={`${id}-price`}
          name="price"
          label="Precio (MXN)"
          inputMode="decimal"
          required
          placeholder="1299.00"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          hint="Precio con IVA, en pesos. Ej.: 1299 o 1,299.50"
          error={errors.price}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-category`}>Categoría</Label>
          <select
            id={`${id}-category`}
            name="categoryId"
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-invalid={errors.categoryId ? true : undefined}
            aria-describedby={errorIdFor("categoryId")}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30"
          >
            <option value="" disabled>
              Elige una categoría
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p id={`${id}-categoryId-error`} className={errorText}>
              {errors.categoryId}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Switch
          id={`${id}-active`}
          name="active"
          checked={active}
          onCheckedChange={setActive}
          aria-describedby={`${id}-active-hint`}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-active`}>Visible en la tienda</Label>
          <p id={`${id}-active-hint`} className="text-xs text-muted-foreground">
            {active
              ? "El producto aparece en el catálogo y se puede comprar."
              : "Borrador: solo lo ves tú en el panel."}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="h-10" disabled={pending}>
          {pending && (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          )}
          {product ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
