import { z } from "zod";

import { idSchema } from "./product";

/** Qué imagen de la portada se edita: el hero o la tarjeta de una categoría. */
export const siteImageTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hero") }),
  z.object({ kind: z.literal("category"), categoryId: idSchema }),
]);

export type SiteImageTarget = z.infer<typeof siteImageTargetSchema>;
