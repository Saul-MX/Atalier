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
pnpm format           # Prettier --write
pnpm db:generate      # prisma generate
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # seed de datos
pnpm db:studio        # Prisma Studio
pnpm auth:generate    # npx @better-auth/cli generate (tablas de Better Auth)
```

Checklist de cierre de cada fase: `pnpm lint && pnpm typecheck && pnpm test` en verde → commit Conventional Commits → resumen ≤ 5 líneas → **detenerse hasta recibir "continúa"**.

## Estructura de carpetas

```
prisma/
  schema.prisma         # modelos (Better Auth generado por CLI + e-commerce)
  migrations/
  seed.ts
prisma.config.ts        # URLs de conexión (Prisma 7)
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
    shop/  admin/  shared/
  lib/                  # utilidades puras y clientes (prisma, stripe, cloudinary, auth)
    env/                # schema.ts (Zod), server.ts (secretos), public.ts (NEXT_PUBLIC_*)
  server/               # lógica de dominio solo-servidor (import "server-only")
    services/           # checkout, orders, inventory…
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
3. **Liberación de stock**: webhook `checkout.session.expired` + Vercel Cron `/api/cron/expire-orders` (cada 15 min) protegido con `Authorization: Bearer ${CRON_SECRET}`.
4. **Una orden pasa a `PAID` solo desde el webhook** y solo si `payment_status === "paid"`. Nunca desde `/checkout/success`.
5. **Webhook**: `await req.text()` (body sin parsear) → `stripe.webhooks.constructEvent` → insertar `event.id` en `StripeEvent` (idempotencia); si ya existe, `200` sin hacer nada.
6. **Admin**: verificar rol con `requireAdmin()` **dentro de cada Route Handler y Server Action**. El proxy/middleware es solo una capa de redirección, nunca la única.
7. **Zod** valida toda entrada de servidor (body, params, searchParams, formData).
8. **Secretos solo en servidor**: nunca prefijo `NEXT_PUBLIC_` para secretos; módulos con secretos importan `"server-only"`. Nunca leer `process.env` directamente en la app: usar `serverEnv("KEY")` (`src/lib/env/server.ts`) o `publicEnv("KEY")` (`src/lib/env/public.ts`), validados con Zod por clave. Al añadir una variable: esquema en `src/lib/env/schema.ts` + `.env.example`.
9. **Tablas de Better Auth**: se generan con `npx @better-auth/cli generate`. No escribirlas a mano.
10. **Accesibilidad**: HTML semántico, foco visible, `label` en cada control, contraste AA, navegación por teclado completa.
11. **Estados de UI**: todo componente que cargue datos tiene estado de carga (skeleton), vacío y error (y "agotado" donde aplique).

## Convenciones

- Server Components por defecto; `"use client"` solo cuando haga falta interactividad.
- Mutaciones: Server Actions para formularios del admin; Route Handlers para endpoints públicos/webhooks.
- Un solo `PrismaClient` compartido en `src/lib/prisma.ts`.
- Imports con alias `@/` → `src/`.
- Nombres: componentes `PascalCase.tsx`, utilidades `kebab-case.ts`.
- Sin `any`; preferir tipos inferidos de Prisma y Zod (`z.infer`).
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`), uno por fase como mínimo.
- **Nunca** commitear `.env*` (salvo `.env.example`). No inventar claves: si falta una credencial o decisión, preguntar.
- Idioma: UI y documentación en español; código (identificadores) en inglés.
