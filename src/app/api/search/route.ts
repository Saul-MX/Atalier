import { type NextRequest } from "next/server";

import { searchQuerySchema } from "@/lib/catalog/search";
import { searchProducts } from "@/server/catalog/queries";

/** Búsqueda predictiva: GET /api/search?q=abrigo */
export async function GET(request: NextRequest) {
  const parsed = searchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Parámetro q inválido (2 a 60 caracteres)." },
      { status: 400 },
    );
  }

  try {
    const results = await searchProducts(parsed.data.q);
    return Response.json({ results });
  } catch (error) {
    console.error("[api/search]", error);
    return Response.json(
      { error: "No se pudo completar la búsqueda." },
      { status: 500 },
    );
  }
}
