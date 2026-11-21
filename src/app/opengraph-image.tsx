import { ImageResponse } from "next/og";

/** Imagen Open Graph por defecto (se genera en el build y queda en caché). */
export const alt = "ATELIER — Moda contemporánea";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#F7F4EE",
        color: "#191714",
      }}
    >
      <div
        style={{ fontSize: 28, letterSpacing: 12, textTransform: "uppercase" }}
      >
        Nueva temporada
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 144, letterSpacing: 36, fontWeight: 600 }}>
          ATELIER
        </div>
        <div style={{ fontSize: 40, color: "#6B6762" }}>
          Siluetas esenciales y materiales nobles.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 28,
          color: "#6B6762",
        }}
      >
        <span>Envío gratis desde $1,500 MXN</span>
        <span>Pago seguro con Stripe</span>
      </div>
    </div>,
    size,
  );
}
