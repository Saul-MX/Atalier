import { type MetadataRoute } from "next";

import { publicEnv } from "@/lib/env/public";

/** Las zonas privadas o transaccionales no se rastrean. */
export default function robots(): MetadataRoute.Robots {
  const base = publicEnv("NEXT_PUBLIC_APP_URL");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/cuenta",
        "/checkout/",
        "/ingresar",
        "/registro",
      ],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
