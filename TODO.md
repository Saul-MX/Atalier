# TODO — ATELIER

Plan por fases basado en la hoja de ruta de [ATELIER.md](ATELIER.md) §11. Cada fase cierra con lint + typecheck + tests en verde, un commit y revisión ("continúa").

## Fase 0 — Base del proyecto

- [x] Next.js 16 (App Router, TS strict, `src/`, alias `@/`) con pnpm
- [x] Tailwind v4 + shadcn/ui; tokens crema/carbón, radio 0.3rem, tipografía
- [x] ESLint + Prettier (+ plugin de Tailwind)
- [x] Vitest (+ Testing Library) con un test de humo
- [x] Prisma 7 inicializado (`prisma.config.ts`, cliente singleton con adapter pg)
- [x] `src/lib/env/` (validación Zod por clave) y `.env.example` completo
- [x] Scripts `lint`, `typecheck`, `test`, `format`, `db:*`, `auth:generate`
- [x] `git init`, `.gitignore` (incluye `.env*`), commit `chore: …`

## Fase 1 — Datos

- [x] Modelos de e-commerce según ATELIER.md §5 (Category, Product, ProductImage, ProductVariant, Order, OrderItem, StripeEvent, OrderStatus)
- [x] Config mínima de Better Auth + CLI oficial (`pnpm auth:generate`) para user/session/account/verification (con campos del plugin admin) y relación `User.orders`
- [x] Primera migración contra Supabase (+ CHECK stock >= 0, importes ≥ 0, total = subtotal + envío)
- [x] Script de seed: 6 categorías, 16 productos, variantes talla × color, imágenes provisionales, admin
- [x] Seed ejecutado y verificado (idempotente; CHECK de stock comprobado)
- [x] Helpers de dinero (centavos ↔ MXN) con tests

## Fase 2 — Tienda pública

- [x] Layout, header, footer, navegación accesible
- [x] Home editorial (hero, colecciones, novedades)
- [x] Catálogo con filtros en `searchParams` (categoría, precio, color, talla) + búsqueda con debounce
- [x] PDP: galería con zoom, selector de variantes dependiente, guía de tallas en modal
- [x] Carrito en drawer (Zustand + localStorage), subtotal, barra de envío gratis
- [x] Estados de carga / vacío / error / agotado

## Fase 3 — Autenticación

- [ ] Better Auth: credenciales + Google, plugin admin, handler `api/auth/[...all]`
- [ ] Páginas de login/registro accesibles
- [ ] `proxy.ts` (redirección rápida) + `requireAdmin()` / `requireUser()` en servidor
- [ ] Tests de `requireAdmin()`

## Fase 4 — Admin: catálogo

- [ ] Layout de admin protegido
- [ ] CRUD de productos (Server Actions + Zod + `requireAdmin()`)
- [ ] Subida firmada a Cloudinary con drag-and-drop; borrado del recurso al eliminar
- [ ] Al subir la primera foto real de un producto, retirar sus placeholders `seed/` (que nunca se borran en Cloudinary)
- [ ] Matriz de variantes talla × color con stock
- [ ] Tras cada mutación del catálogo: `revalidateTag(CATALOG_TAG)` / `productTag(slug)` (src/server/catalog/queries.ts)

## Fase 5 — Pagos y stock

- [ ] `POST /api/checkout`: Zod, relectura de precios, reserva condicional en transacción, 409, Order PENDING
- [ ] Stripe Checkout Session (`metadata.orderId`, `expires_at` ≥ 30 min, `shipping_address_collection`, envío)
- [ ] Liberación de stock si falla Stripe (`CANCELLED`)
- [ ] `/api/stripe/webhook`: `req.text()`, firma, idempotencia `StripeEvent`, `completed` → PAID, `expired` → EXPIRED + stock
- [ ] `/api/cron/expire-orders` + `vercel.json` (cada 15 min, `CRON_SECRET`)
- [ ] `/checkout/success` (solo lectura) y `/checkout/cancel`
- [ ] Conectar el botón "Pagar" del CartDrawer (hoy deshabilitado) y vaciar el carrito tras pago confirmado
- [ ] Revalidar `CATALOG_TAG` cuando el checkout/webhook cambie stock
- [ ] Test: stock = 1, 20 peticiones simultáneas → 1 éxito, 19 × 409, stock final 0
- [ ] Test: mismo evento de webhook procesado dos veces → sin efectos duplicados

## Fase 6 — Pedidos y métricas

- [ ] Admin: tabla de pedidos con filtro por estado, detalle, transición PAID → SHIPPED → DELIVERED
- [ ] Dashboard: ingresos, pendientes, stock bajo, gráfica de ventas 30 días
- [ ] Mi cuenta: historial de pedidos del cliente

## Fase 7 — Pulido y publicación

- [ ] SEO: metadata dinámica, Open Graph, `sitemap.ts`, `robots.ts`
- [ ] PDP inexistente responde 200 + noindex (notFound dentro de Suspense); valorar 404 real
- [ ] Rendimiento (`next/image`, caché) y Lighthouse ≥ 90
- [ ] Auditoría de accesibilidad
- [ ] README: decisiones técnicas, diagramas, credenciales de prueba, tarjeta 4242, guía local y de Vercel

## Pendientes / decisiones abiertas

- Fotos reales: las sube el usuario desde el admin (Fase 4); hasta entonces, SVG provisionales en public/seed/
- Google OAuth (Fase 3), Cloudinary (Fase 4), Stripe test (Fase 5)
- BD para tests de integración de la Fase 5 (¿proyecto Supabase aparte o Postgres local con Docker?)
