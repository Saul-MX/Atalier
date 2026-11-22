"use client";

import { SearchIcon } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { lazyWithPreload } from "@/lib/lazy";

import {
  HEADER_ACTION_CLASS,
  HEADER_ICON_CLASS,
  HEADER_LABEL_CLASS,
} from "./header-action";

const SearchDialog = lazyWithPreload(() =>
  import("./search-dialog").then((m) => m.SearchDialog),
);

/**
 * Botón de búsqueda de la cabecera. El diálogo (Radix + lógica de búsqueda)
 * no va en el JS inicial: se descarga al abrirlo o al acercarse al botón.
 */
export function SearchLauncher() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  const show = (value: boolean) => {
    if (value) setRequested(true);
    setOpen(value);
  };

  // Atajo de teclado: Ctrl/Cmd + K (funciona antes de cargar el diálogo).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setRequested(true);
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        className={HEADER_ACTION_CLASS}
        aria-label="Buscar productos"
        aria-haspopup="dialog"
        onPointerEnter={SearchDialog.preload}
        onFocus={SearchDialog.preload}
        onClick={() => show(true)}
      >
        <SearchIcon aria-hidden="true" className={HEADER_ICON_CLASS} />
        <span aria-hidden="true" className={HEADER_LABEL_CLASS}>
          Buscar
        </span>
      </Button>
      {requested && (
        <Suspense fallback={null}>
          <SearchDialog
            open={open}
            onOpenChange={show}
            returnFocusRef={buttonRef}
          />
        </Suspense>
      )}
    </>
  );
}
