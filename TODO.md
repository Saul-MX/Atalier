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

- [x] Better Auth: credenciales + Google, plugin admin, handler `api/auth/[...all]`
- [x] Páginas de login/registro accesibles + menú de usuario + /cuenta + /admin protegido
- [x] `proxy.ts` (redirección rápida) + `requireAdmin()` / `requireUser()` en servidor
- [x] Tests de `requireAdmin()`, `withAdmin`, proxy, safeRedirect, formularios
- [x] Verificación E2E contra servidor real: registro, roles, 401/403 en API admin, set-role bloqueado, login admin, logout
- [ ] Probar en navegador el login con Google (flujo OAuth completo)

## Fase 4 — Admin: catálogo

- [x] Layout de admin protegido + navegación (Panel, Productos)
- [x] CRUD de productos (Server Actions + Zod + `requireAdmin()`); con pedidos no se borra, se desactiva
- [x] Subida firmada a Cloudinary con drag-and-drop (carpeta por producto, firma de respuesta verificada en servidor); borrado del recurso al eliminar foto o producto
- [x] Al subir la primera foto real de un producto, retirar sus placeholders `seed/` (que nunca se borran en Cloudinary)
- [x] Matriz de variantes talla × color con stock (escritura condicional: no pisa reservas hechas mientras se edita)
- [x] Tras cada mutación del catálogo: `updateTag(CATALOG_TAG)` / `productTag(slug)` (src/server/catalog/invalidate.ts)
- [x] Verificación E2E contra servidor real + Cloudinary (31 comprobaciones)

## Fase 5 — Pagos y stock

- [x] `POST /api/checkout`: Zod, relectura de precios, reserva condicional en transacción (filas en orden por id), 409 con stock disponible, Order PENDING
- [x] Stripe Checkout Session (`metadata.orderId`, `expires_at` 31 min, `shipping_address_collection` MX, envío como `shipping_options`, solo tarjeta, idempotency key)
- [x] Liberación de stock si falla Stripe (`CANCELLED`)
- [x] `/api/stripe/webhook`: `req.text()`, firma, idempotencia `StripeEvent` en la misma transacción, `completed`+paid → PAID, `expired` → EXPIRED + stock
- [x] `/api/cron/expire-orders` + `vercel.json` (cada 15 min, `CRON_SECRET`); expira la sesión en Stripe antes de liberar
- [x] `/checkout/success` (solo lectura, se refresca hasta PAID) y `/checkout/cancel`
- [x] Botón "Pagar" del CartDrawer conectado; ajusta el carrito al stock real en 409; vacía el carrito al confirmarse el pago
- [x] Revalidar `CATALOG_TAG` cuando el checkout/webhook/cron cambian stock
- [x] Tests escritos: 20 peticiones simultáneas (1 éxito, 19 × 409, stock 0) y webhook duplicado (secuencial y concurrente) — `tests/integration/`
- [x] Smoke test con la API real de Stripe: checkout → sesión → cron expira y libera (11/11)
- [x] `pnpm test:integration` en Docker: 17/17 (y verificado que el test de concurrencia falla si se quita la condición `stock >= qty`)
- [x] E2E con tarjeta 4242 y webhooks reales (`stripe listen --api-key`): PAID, stock, carrito vaciado, cancelación y expiración (19/19)

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
- Cloudinary (Fase 4), Stripe test (Fase 5)
- BD para tests de integración: Postgres local con Docker (docker-compose.yml, puerto 54329)
- Stripe: la clave es de un **sandbox**; `stripe listen` debe usar `--api-key <sk_test del sandbox>` o no recibe eventos (el `stripe login` apunta a otra cuenta)
- Vercel Hobby solo permite crons diarios: el webhook es el mecanismo principal; el cron cada 15 min requiere plan Pro
- Pedidos de invitado: `Order.email` queda vacío hasta que el webhook guarda el correo de Stripe
