import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // `experimental.inlineCss` se probó y empeoró el FCP móvil (759 → 983 ms):
  // el HTML crece mucho más de lo que ahorra quitar la hoja de estilos.
  images: {
    // Imágenes de producto subidas desde el admin (Fase 4).
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
