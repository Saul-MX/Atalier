# CLAUDE.md — ATELIER

E-commerce de moda para portfolio. **La fuente de verdad es [ATELIER.md](ATELIER.md)** (stack, esquema, flujo de Stripe, estrategia de stock, seguridad). El plan vivo está en [TODO.md](TODO.md).

@AGENTS.md

> Next.js 16 trae cambios de API: antes de usar una API de Next, consultar la doc instalada en `node_modules/next/dist/docs/`. Prisma 7: URLs en `prisma.config.ts` (CLI → `DIRECT_URL`), la app usa `@prisma/adapter-pg` con `DATABASE_URL`; el cliente se genera en `src/generated/prisma` (gitignored, `postinstall` lo regenera) y se importa desde `@/generated/prisma/client`.

## Stack (no cambiar sin aprobación explícita)

- Next.js 16 (App Router) + TypeScript `strict`
- Tailwind CSS v4 + shadcn/ui (Radix) — tokens estilo Tweakcn en `src/app/globals.css`
- Better Auth (credenciales + Google, plugin `admin`)
- Prisma 7 + PostgreSQL (Supabase): pooler para la app, conexión directa para migraciones
- Cloudinary (subida firmada desde el navegador)
- Stripe Checkout en **modo test**, moneda `mxn`
- Zustand (carrito, persistido en localStorage)
- Zod para toda validación en servidor
- Vitest para tests; ESLint + Prettier
- Despliegue: Vercel. Gestor de paquetes: **pnpm** (nunca npm/yarn para instalar)

## Comandos

```bash
pnpm dev              # servidor de desarrollo
pnpm build            # build de producción
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest (una pasada)
pnpm db:test:up       # Postgres de tests en Docker (puerto 54329, en memoria)
pnpm test:integration # tests contra Postgres real (concurrencia de stock, webhook, cron)
pnpm format           # Prettier --write
pnpm db:generate      # prisma generate
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # seed de datos
pnpm db:studio        # Prisma Studio
pnpm auth:generate    # CLI oficial de Better Auth (paquete `auth`) → modelos en schema.prisma
pnpm seed:images      # regenera las imágenes provisionales de public/seed/
```

Checklist de cierre de cada fase: `pnpm lint && pnpm typecheck && pnpm test` en verde → resumen ≤ 5 líneas → **mensaje de commit** (Conventional Commits) para que el usuario lo haga → **detenerse hasta recibir "continúa"**.

**Claude nunca ejecuta `git commit` ni `git push`**: los commits los hace el usuario.

## Estructura de carpetas

```
prisma/
  schema.prisma         # modelos (Better Auth generado por CLI + e-commerce)
  migrations/
  seed.ts
  seed-data.ts          # catálogo de demo (precios en centavos, stock determinista)
prisma.config.ts        # URLs de conexión (Prisma 7) y comando de seed
auth.config.ts          # Better Auth para la CLI y el seed (sin server-only); la app NO lo importa
scripts/                # utilidades de desarrollo (p. ej. generate-seed-images.ts)
src/
  app/
    (shop)/             # tienda pública: home, catálogo, PDP, checkout, cuenta
    admin/              # panel de admin (rol admin)
    api/
      auth/[...all]/    # handler de Better Auth
      checkout/         # POST: reserva de stock + Checkout Session
      stripe/webhook/   # webhook idempotente
      cron/expire-orders/
  components/
    ui/                 # shadcn/ui (generado, no editar a mano salvo tokens)
    shop/               # header, footer, tarjetas, búsqueda
    catalog/            # filtros, orden, paginación (estado en la URL)
    product/            # galería, selector de variantes, guía de tallas
    cart/               # drawer, líneas, barra de envío gratis, hidratación
    shared/             # Container, Price, EmptyState, ErrorState
    admin/
  lib/                  # utilidades puras y clientes (prisma, stripe, cloudinary, auth)
    cloudinary.ts       # firma de subida, verificación de respuesta, borrado (server-only)
    env/                # schema.ts (Zod), server.ts (secretos), public.ts (NEXT_PUBLIC_*)
    auth/               # options.ts (CLI+app), index.ts (servidor), client.ts (navegador), roles.ts (puro), schemas.ts
    safe-redirect.ts    # valida ?next= (anti open-redirect)
    money.ts            # centavos ↔ texto; única frontera de formateo
  server/               # lógica de dominio solo-servidor (import "server-only")
    catalog/queries.ts  # lecturas públicas con "use cache" + cacheTag(CATALOG_TAG)
    catalog/invalidate.ts # updateTag tras mutaciones del admin (solo Server Actions)
    auth/guards.ts      # getSession, requireUser/requireAdmin, withAdmin (Route Handlers), *Page (páginas), toActionError
    services/           # admin-products, admin-orders (pedidos + métricas), site-content (imágenes de la portada), checkout (Stripe), orders (reserva/stock, historial)
    validators/         # esquemas Zod
  stores/               # Zustand (carrito)
  generated/prisma/     # cliente Prisma generado (gitignored)
  proxy.ts              # (Next 16: sustituye a middleware.ts) chequeo rápido de sesión
tests/                  # tests de integración (concurrencia, webhook)
```

Tests unitarios colocados junto al código: `*.test.ts(x)`.

## Reglas no negociables

1. **Dinero en centavos (`Int`)** en todas partes. Formatear solo en la UI. El servidor **ignora cualquier precio del cliente** y lo relee de la BD.
2. **Reserva de stock** al crear el checkout: `UPDATE "ProductVariant" SET stock = stock - $qty WHERE id = $id AND stock >= $qty` con `$executeRaw` dentro de `prisma.$transaction`. 0 filas afectadas → abortar y responder **409** indicando la variante. Si falla Stripe → devolver stock y marcar `CANCELLED`.
3. **Liberación de stock**: webhook `checkout.session.expired` + Vercel Cron `/api/cron/expire-orders` (diario: límite del plan Hobby) protegido con `Authorization: Bearer ${CRON_SECRET}`.
4. **Una orden pasa a `PAID` solo desde el webhook** y solo si `payment_status === "paid"`. Nunca desde `/checkout/success`.
5. **Webhook**: `await req.text()` (body sin parsear) → `stripe.webhooks.constructEvent` → insertar `event.id` en `StripeEvent` (idempotencia); si ya existe, `200` sin hacer nada.
6. **Admin**: verificar rol **dentro de cada Route Handler y Server Action** (`withAdmin(handler)` o `await requireAdmin()` + `toActionError`) y en cada página (`requireAdminPage`). `src/proxy.ts` y el layout de `/admin` son solo UX, nunca la barrera. La sesión no se cachea entre peticiones (revocar rol/baneo surte efecto inmediato). Comprobar roles solo con `isAdminRole()` (roles separados por comas).
7. **Zod** valida toda entrada de servidor (body, params, searchParams, formData).
8. **Secretos solo en servidor**: nunca prefijo `NEXT_PUBLIC_` para secretos; módulos con secretos importan `"server-only"`. Nunca leer `process.env` directamente en la app: usar `serverEnv("KEY")` (`src/lib/env/server.ts`) o `publicEnv("KEY")` (`src/lib/env/public.ts`), validados con Zod por clave. Al añadir una variable: esquema en `src/lib/env/schema.ts` + `.env.example`.
9. **Tablas de Better Auth**: se generan con `pnpm auth:generate` (CLI oficial `auth@<misma versión que better-auth>`; `@better-auth/cli` está deprecado). No escribirlas a mano. Las únicas ediciones manuales permitidas en esos modelos son relaciones con el e-commerce (`User.orders`); la CLI las conserva. Cualquier opción que cambie el esquema (plugins, campos) va en `src/lib/auth/options.ts` para que app y CLI coincidan.
10. **Accesibilidad**: HTML semántico, foco visible, `label` en cada control, contraste AA, navegación por teclado completa.
11. **Estados de UI**: todo componente que cargue datos tiene estado de carga (skeleton), vacío y error (y "agotado" donde aplique).

## Convenciones

- Server Components por defecto; `"use client"` solo cuando haga falta interactividad.
- **Cache Components (Next 16)**: `searchParams`, `params`, `cookies()` y lecturas sin cachear van dentro de `<Suspense>`; lecturas públicas con `"use cache"` + `cacheLife` + `cacheTag`. `pnpm build` valida estas reglas: ejecútalo cuando toques páginas.
- `error.tsx` recibe `{ error, retry }` (no `reset`). En `next/image` usar `preload` (no `priority`).
- Filtros del catálogo: única fuente de verdad en `src/lib/catalog/filters.ts` (parse/serialize de la URL).
- Carrito: `skipHydration` + `CartHydrator`; los precios del carrito son solo informativos.
- Mutaciones: Server Actions para formularios del admin; Route Handlers para endpoints públicos/webhooks.
- Un solo `PrismaClient` compartido en `src/lib/prisma.ts` (la app). Scripts fuera de Next (seed, CLI) usan el de `auth.config.ts`.
- Imágenes del seed: `publicId` con prefijo `seed/` y URL local `/seed/*.svg`; no son recursos de Cloudinary (no borrarlas allí).
- Borrar un producto con pedidos no es posible (`OrderItem → ProductVariant` sin cascada): desactivarlo (`active = false`).
- Imports con alias `@/` → `src/`.
- Nombres: componentes `PascalCase.tsx`, utilidades `kebab-case.ts`.
- Sin `any`; preferir tipos inferidos de Prisma y Zod (`z.infer`).
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`), uno por fase como mínimo. Claude propone el mensaje; el usuario hace el commit.
- **Nunca** commitear `.env*` (salvo `.env.example`). No inventar claves: si falta una credencial o decisión, preguntar.
- Idioma: UI y documentación en español; código (identificadores) en inglés.
