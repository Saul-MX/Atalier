"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { Price } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { catalogHref } from "@/lib/catalog/filters";
import { SEARCH_MIN_LENGTH } from "@/lib/catalog/search";
import { type SearchResult } from "@/lib/catalog/types";

import { ProductImage } from "./product-image";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; query: string; results: SearchResult[] };

type FetchResult =
  | { key: string; status: "done"; results: SearchResult[] }
  | { key: string; status: "error" };

export function SearchDialog() {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<FetchResult | null>(null);
  const debounced = useDebouncedValue(query.trim(), 250);

  // "idle" y "loading" se derivan del término actual; solo el resultado de la
  // petición se guarda en estado (y únicamente desde callbacks asíncronos).
  const requestKey = `${debounced}#${attempt}`;
  const state: SearchState =
    debounced.length < SEARCH_MIN_LENGTH
      ? { status: "idle" }
      : result?.key !== requestKey
        ? { status: "loading" }
        : result.status === "error"
          ? { status: "error" }
          : { status: "done", query: debounced, results: result.results };

  // Atajo de teclado: Ctrl/Cmd + K
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (debounced.length < SEARCH_MIN_LENGTH) return;
    const key = `${debounced}#${attempt}`;
    const controller = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as { results: SearchResult[] };
        setResult({ key, status: "done", results: data.results });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setResult({ key, status: "error" });
      });

    return () => controller.abort();
  }, [debounced, attempt]);

  const close = () => setOpen(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    close();
    router.push(catalogHref({ q }));
  };

  const statusMessage =
    state.status === "loading"
      ? "Buscando…"
      : state.status === "error"
        ? "No se pudo completar la búsqueda."
        : state.status === "done"
          ? state.results.length === 0
            ? `Sin resultados para «${state.query}».`
            : `${state.results.length} ${state.results.length === 1 ? "resultado" : "resultados"}.`
          : `Escribe al menos ${SEARCH_MIN_LENGTH} caracteres.`;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Buscar productos">
          <SearchIcon aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-[15%] translate-y-0 gap-4 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Buscar</DialogTitle>
          <DialogDescription>
            Busca por prenda o categoría. Pulsa Intro para ver todos los
            resultados.
          </DialogDescription>
        </DialogHeader>

        <form role="search" onSubmit={submit} className="relative">
          <label htmlFor={inputId} className="sr-only">
            Buscar productos
          </label>
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Abrigo, camisa, punto…"
            autoComplete="off"
            className="h-11 pl-9"
            maxLength={60}
          />
          {state.status === "loading" && (
            <Loader2Icon
              className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </form>

        <p className="text-sm text-muted-foreground" role="status">
          {statusMessage}
        </p>

        {state.status === "error" && (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Reintentar
          </Button>
        )}

        {state.status === "done" && state.results.length > 0 && (
          <>
            <ul className="-mx-2 flex max-h-[50vh] flex-col overflow-y-auto">
              {state.results.map((result) => (
                <li key={result.slug}>
                  <Link
                    href={`/producto/${result.slug}`}
                    onClick={close}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <span className="relative aspect-[3/4] w-10 shrink-0 overflow-hidden rounded bg-muted">
                      <ProductImage src={result.image} alt="" sizes="40px" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {result.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {result.category}
                      </span>
                    </span>
                    <Price cents={result.price} className="text-sm" />
                  </Link>
                </li>
              ))}
            </ul>
            <Button asChild variant="link" className="self-start px-0">
              <Link href={catalogHref({ q: state.query })} onClick={close}>
                Ver todos los resultados de «{state.query}»
              </Link>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
