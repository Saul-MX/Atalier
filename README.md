# ATELIER

E-commerce de moda contemporánea (proyecto de portfolio). Next.js 16 · TypeScript · Tailwind + shadcn/ui · Better Auth · Prisma + PostgreSQL (Supabase) · Cloudinary · Stripe Checkout (modo test).

> En construcción. La especificación está en [ATELIER.md](ATELIER.md), las convenciones en [CLAUDE.md](CLAUDE.md) y el plan en [TODO.md](TODO.md). El README completo (decisiones técnicas, despliegue, credenciales de prueba) llega en la Fase 7.

## Desarrollo local

Requisitos: Node.js ≥ 24 y pnpm.

```bash
pnpm install
cp .env.example .env   # y rellena los valores
pnpm dev
```

Comprobaciones: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
