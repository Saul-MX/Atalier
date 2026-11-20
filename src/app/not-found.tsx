import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-semibold tracking-[0.3em]">ATELIER</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Página no encontrada
      </h1>
      <p className="text-muted-foreground">
        La página que buscas no existe o se ha movido.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
