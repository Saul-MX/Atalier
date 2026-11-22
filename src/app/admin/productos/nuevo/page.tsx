import { ArrowLeftIcon } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ProductForm } from "@/components/admin/product-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminPage } from "@/server/auth/guards";
import {
  getCategoryOptions,
  getModelOptions,
} from "@/server/services/admin-products";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NewProductPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/admin/productos"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Productos
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Nuevo producto
        </h1>
        <p className="text-sm text-muted-foreground">
          Empieza por los datos básicos. Después podrás subir fotos y definir
          variantes; el producto queda como borrador hasta que lo actives.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-[28rem] w-full" />}>
        <NewProduct />
      </Suspense>
    </div>
  );
}

async function NewProduct() {
  await requireAdminPage("/admin/productos/nuevo");
  const [categories, models] = await Promise.all([
    getCategoryOptions(),
    getModelOptions(),
  ]);
  return <ProductForm categories={categories} models={models} />;
}
