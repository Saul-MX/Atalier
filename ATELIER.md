# ATELIER: Tienda de Moda & Accesorios (Fullstack + UX/UI)

Documento de proyecto para portfolio. Versión completa y corregida.

---

## 1. Visión

**Nombre:** ATELIER

**Propuesta de valor:** e-commerce de moda contemporánea con experiencia de compra editorial y minimalista, más un panel de administración para catálogo, inventario por variantes e imágenes en la nube.

**Costo operativo:** $0 en planes gratuitos (Vercel, Supabase, Cloudinary, Stripe en modo test).

> Aviso: los proyectos gratuitos de Supabase se pausan tras un periodo de inactividad. Revisa que la demo esté activa antes de compartir tu portfolio, o agrega un cron que haga ping a la base de datos.

---

## 2. Stack

| Capa          | Herramienta                                | Rol                                                               |
| ------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Diseño        | Figma                                      | Wireframes, design system, prototipo desktop/mobile               |
| Framework     | Next.js (App Router)                       | SSR para SEO, Server Components, Route Handlers y Server Actions  |
| Lenguaje      | TypeScript                                 | Tipado estricto de variantes, carrito y respuestas                |
| UI            | Tailwind CSS + shadcn/ui                   | Componentes accesibles (Radix)                                    |
| Tokens        | Tweakcn                                    | Personalización de radios, paleta y variables CSS                 |
| Auth          | Better Auth                                | Sesiones, login con Google y credenciales, roles (plugin `admin`) |
| Base de datos | Supabase (PostgreSQL)                      | Datos relacionales                                                |
| ORM           | Prisma                                     | Esquema declarativo, migraciones, consultas tipadas               |
| Imágenes      | Cloudinary                                 | Almacenamiento y CDN, conversión automática a WebP                |
| Pagos         | **Stripe Checkout (modo test)** + webhooks | Pago alojado por Stripe                                           |
| Hosting       | Vercel                                     | CI/CD desde GitHub, SSL                                           |

---

## 3. Stripe Checkout: modo de prueba

- Stripe tiene **modo de prueba (test mode)**. Se activa usando las claves `sk_test_...` y `pk_test_...` y no mueve dinero real.
- Tarjetas de prueba (fecha futura cualquiera, CVC cualquiera):
  - Pago exitoso: `4242 4242 4242 4242`
  - Rechazada: `4000 0000 0000 0002`
  - Requiere autenticación 3D Secure: `4000 0025 0000 3155`
- Webhooks en local: instala Stripe CLI y ejecuta
  `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  Te entrega un `whsec_...` para tu `.env`.
- Moneda: `mxn`. Los montos se envían en **centavos** (entero).
- Incluye en el README de tu demo la tarjeta de prueba para que cualquier reclutador pueda completar una compra.

---

## 4. Módulos

### Módulo A: Tienda pública

1. **Home editorial:** hero con colecciones destacadas, grid de novedades.
2. **Catálogo con filtros:** categoría, rango de precio, color y talla disponible. Los filtros se guardan en la URL (`searchParams`) para poder compartir enlaces y mantener SEO. Búsqueda predictiva con debounce.
3. **Detalle de producto (PDP):** galería con zoom, selector de variantes dependiente (al elegir color, solo se habilitan tallas con stock), guía de tallas en modal accesible.
4. **Carrito (drawer):** subtotal inmediato y barra de progreso de envío gratis. El carrito vive en el cliente (Zustand + localStorage). **El servidor nunca confía en los precios del cliente**: al crear el checkout vuelve a leer precios y stock desde la base de datos.
5. **Checkout:** el botón "Pagar" crea una Checkout Session y redirige a Stripe. La dirección de envío se recoge en Stripe (`shipping_address_collection`) y se guarda en la orden desde el webhook.
6. **Páginas de resultado:** `/checkout/success` (muestra el resumen de la orden leyendo la sesión de Stripe) y `/checkout/cancel` (el carrito se conserva).
7. **Mi cuenta:** historial de pedidos del usuario.

### Módulo B: Panel de administración

Acceso solo para rol `admin`.

1. **Dashboard:** ingresos, pedidos pendientes, productos con stock bajo, ventas de los últimos 30 días (gráfica).
2. **Catálogo (CRUD):** subida de múltiples imágenes con drag-and-drop directo a Cloudinary (firma generada en el servidor). Matriz de variantes talla × color con stock.
3. **Pedidos:** tabla con filtros por estado, detalle de orden y cambio de estado (`PAID` → `SHIPPED` → `DELIVERED`).

---

## 5. Modelo de datos (Prisma + PostgreSQL)

> Las tablas de Better Auth (`user`, `session`, `account`, `verification`) **genéralas con su CLI** para que coincidan con tu versión:
> `npx @better-auth/cli generate`
> Después añade tus relaciones. Con el plugin `admin`, el usuario recibe los campos `role`, `banned`, `banReason` y `banExpires`, y la sesión `impersonatedBy`. El bloque de abajo es una referencia de cómo queda.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooler de Supabase
  directUrl = env("DIRECT_URL")     // conexión directa, para migraciones
}

// ---------- Better Auth (referencia; regenerar con la CLI) ----------
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          String?   @default("user")   // plugin admin: "admin" | "user"
  banned        Boolean?  @default(false)
  banReason     String?
  banExpires    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions Session[]
  accounts Account[]
  orders   Order[]

  @@map("user")
}

model Session {
  id             String   @id
  expiresAt      DateTime
  token          String   @unique
  ipAddress      String?
  userAgent      String?
  impersonatedBy String?
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("verification")
}

// ---------- E-commerce ----------
enum OrderStatus {
  PENDING     // checkout creado, stock reservado, esperando pago
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
  EXPIRED     // el cliente no pagó a tiempo; stock liberado
}

model Category {
  id       String    @id @default(cuid())
  name     String
  slug     String    @unique
  products Product[]
}

model Product {
  id          String           @id @default(cuid())
  name        String
  slug        String           @unique
  description String
  basePrice   Int              // centavos MXN
  active      Boolean          @default(true)
  categoryId  String
  category    Category         @relation(fields: [categoryId], references: [id])
  images      ProductImage[]
  variants    ProductVariant[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([categoryId])
}

model ProductImage {
  id        String  @id @default(cuid())
  url       String
  publicId  String  // id de Cloudinary, necesario para borrar
  isMain    Boolean @default(false)
  position  Int     @default(0)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductVariant {
  id         String      @id @default(cuid())
  size       String      // XS, S, M, L, XL o "Única"
  color      String
  colorHex   String?
  stock      Int         @default(0)
  sku        String?     @unique
  productId  String
  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  orderItems OrderItem[]

  @@unique([productId, size, color])   // evita variantes duplicadas
}

model Order {
  id              String      @id @default(cuid())
  userId          String?     // null = compra como invitado
  user            User?       @relation(fields: [userId], references: [id])
  email           String      // siempre guardar el correo
  status          OrderStatus @default(PENDING)
  subtotal        Int         // centavos
  shippingCost    Int         @default(0)
  total           Int         // centavos
  currency        String      @default("mxn")
  stripeSessionId String?     @unique
  paymentIntentId String?
  paidAt          DateTime?
  expiresAt       DateTime?   // para PENDING
  shippingName    String?
  shippingLine1   String?
  shippingLine2   String?
  shippingCity    String?
  shippingState   String?
  shippingZip     String?
  shippingCountry String?
  items           OrderItem[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([status, createdAt])
  @@index([userId])
}

model OrderItem {
  id        String         @id @default(cuid())
  orderId   String
  order     Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  name      String         // copia del nombre al momento de la compra
  quantity  Int
  price     Int            // centavos, copia del precio al momento de la compra
}

// Idempotencia de webhooks
model StripeEvent {
  id          String   @id   // evt_...
  type        String
  processedAt DateTime @default(now())
}
```

Notas:

- Los precios se guardan como **enteros en centavos**. Evita problemas de serialización de `Decimal` en Next.js y coincide con el formato de Stripe.
- En Supabase usa la URL del **pooler** para la app (Vercel es serverless) y la conexión directa para `prisma migrate`.
- Usa un único `PrismaClient` compartido (`lib/prisma.ts`) para no agotar conexiones.

---

## 6. El problema técnico central: no vender de más

Dos clientes pagan al mismo tiempo la **última unidad** de una variante. Solo uno debe lograrlo.

**Estrategia: reservar stock al crear el checkout.**

1. `POST /api/checkout` recibe `[{ variantId, quantity }]` (solo ids y cantidades; nunca precios).
2. Dentro de `prisma.$transaction`:
   - Lee precios reales desde la base de datos.
   - Por cada ítem ejecuta un descuento condicional:
     ```sql
     UPDATE "ProductVariant"
     SET stock = stock - $qty
     WHERE id = $id AND stock >= $qty
     ```
     (con `prisma.$executeRaw`). Si afecta **0 filas**, no hay stock suficiente: aborta toda la transacción y responde `409` indicando qué variante falló.
   - Crea la `Order` en `PENDING` con `expiresAt` y sus `OrderItem`.
3. Crea la Checkout Session de Stripe con `metadata: { orderId }` y `expires_at` (Stripe exige un mínimo de 30 minutos). Guarda `stripeSessionId` en la orden.
4. Si falla la creación de la sesión de Stripe, libera el stock (devuelve las cantidades) y marca la orden como `CANCELLED`.

**Liberación del stock:**

- Webhook `checkout.session.expired`: la orden pasa a `EXPIRED` y se devuelve el stock.
- Respaldo: Vercel Cron cada 15 min (`/api/cron/expire-orders`) que expira órdenes `PENDING` vencidas. Protege la ruta con un secreto (`CRON_SECRET`).

**Test obligatorio:** variante con `stock = 1` y 20 llamadas simultáneas a `/api/checkout`. Resultado esperado: una orden creada, 19 respuestas `409` y `stock = 0`.

---

## 7. Flujo de pago completo

```
Carrito (cliente)
   │  POST /api/checkout  (variantId + quantity)
   ▼
Servidor: valida sesión/invitado → transacción (reserva stock + crea Order PENDING)
   │  stripe.checkout.sessions.create({ mode: "payment", line_items, metadata: { orderId },
   │     shipping_address_collection, customer_email, success_url, cancel_url, expires_at })
   ▼
Redirección a Stripe Checkout (página alojada)
   │
   ├─ pago OK  ──► webhook checkout.session.completed ──► Order = PAID, guarda dirección y paymentIntent
   ├─ cancela  ──► vuelve a /checkout/cancel (la orden sigue PENDING hasta expirar)
   └─ no paga  ──► webhook checkout.session.expired    ──► Order = EXPIRED, libera stock
```

Reglas del webhook (`/api/stripe/webhook`):

- Lee el cuerpo **sin parsear**: `const body = await req.text()` y verifica la firma con `stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)`.
- **Idempotente:** inserta el `event.id` en `StripeEvent` (clave única) antes de procesar. Si ya existe, responde `200` y no hace nada.
- Confirma `payment_status === "paid"` antes de marcar `PAID`.
- La orden pasa a `PAID` **solo desde el webhook**, nunca desde la página de éxito.
- Responde `200` rápido y deja fuera del webhook el trabajo pesado (por ejemplo, el correo de confirmación).

Envío gratis: calcula `shippingCost` en el servidor (por ejemplo, gratis desde $1,500 MXN) y envíalo como una línea más o con `shipping_options`.

---

## 8. Autenticación y seguridad (Better Auth)

- Adaptador de Prisma con `provider: "postgresql"`.
- `emailAndPassword` y Google habilitados.
- Handler en `app/api/auth/[...all]/route.ts` con `toNextJsHandler`.
- Plugin `admin` para el rol. Crea el primer administrador con un script de seed o asignándolo en la base de datos.
- Protección en **dos capas**:
  1. `middleware.ts`: chequeo rápido de sesión para redirigir.
  2. **Dentro de cada Route Handler y Server Action de admin**: verificación real del rol. Nunca confíes solo en el middleware.
- Validación de entradas con Zod en el servidor.
- Variables secretas solo en el servidor (`STRIPE_SECRET_KEY`, `BETTER_AUTH_SECRET`, `CLOUDINARY_API_SECRET`).

---

## 9. Imágenes (Cloudinary)

- Subida firmada: el servidor genera la firma y el navegador sube directo a Cloudinary (no pasa por tu función serverless).
- Guarda `url` y `publicId`. Al borrar un producto o imagen, elimina también el recurso en Cloudinary.
- En la UI usa `next/image` con el dominio de Cloudinary en `remotePatterns`.

---

## 10. Diseño UX/UI (Figma + Tweakcn)

- **Estilo:** minimalista moderno (referencias: Zara, COS, Jacquemus).
- **Tipografía:** Inter, Geist o Plus Jakarta Sans.
- **Color:** fondos crema/off-white y carbón profundo; el color lo ponen las prendas.
- **Radios:** sutiles (0.25 a 0.375 rem).
- **Microinteracciones:** cambio de foto al hover en tarjetas, feedback al añadir al carrito, transiciones suaves en el drawer.
- **Entregables en Figma:** tokens (color, tipografía, espaciado), componentes maestros, wireframes y prototipo de: Home, Catálogo, PDP, Carrito, Admin (Dashboard, Producto, Pedidos), en desktop y mobile.
- **Estados de UI:** carga (skeletons), vacío, error y agotado en cada pantalla.

---

## 11. Hoja de ruta

| Semana | Foco                  | Entregables                                                                                                                                              |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | Diseño y base         | Figma con tokens y pantallas clave. Proyecto Next.js + Tailwind + shadcn + Tweakcn. Prisma + Supabase conectados. Esquema migrado y seed de productos    |
| **2**  | Tienda pública        | Home, catálogo con filtros en URL, PDP con variantes dependientes, carrito con persistencia y barra de envío gratis                                      |
| **3**  | Auth y admin          | Better Auth con Google y credenciales, rol admin, middleware + verificación en servidor. CRUD de productos con subida a Cloudinary y matriz de variantes |
| **4**  | Pagos y stock         | `/api/checkout` con reserva de stock, Stripe Checkout, webhook idempotente, expiración (webhook + Cron), tests de concurrencia                           |
| **5**  | Pedidos y métricas    | Gestor de pedidos con cambio de estado, dashboard con métricas, historial del cliente, correo de confirmación opcional                                   |
| **6**  | Calidad y publicación | Accesibilidad, SEO (metadata dinámica, sitemap), rendimiento, despliegue en Vercel, README y video/GIF de demo                                           |

---

## 12. Criterios de aceptación

- [ ] Es imposible vender más unidades que el stock, y un test lo demuestra.
- [ ] Una compra con la tarjeta `4242...` termina con la orden en `PAID` y el stock correcto.
- [ ] Un pago abandonado libera el stock.
- [ ] El webhook procesado dos veces no duplica efectos.
- [ ] Un usuario sin rol admin no puede ejecutar ninguna acción de admin (ni en la UI ni llamando a la API directamente).
- [ ] El servidor ignora cualquier precio enviado por el cliente.
- [ ] Lighthouse ≥ 90 en rendimiento, accesibilidad y SEO en las páginas públicas.
- [ ] La demo funciona en celular.

---

## 13. Retos extra

- Reseñas de productos y lista de deseos.
- Códigos de descuento (cupones de Stripe).
- Correos transaccionales con Resend.
- Búsqueda con `pg_trgm` o búsqueda de texto completo de PostgreSQL.
- Reembolsos desde el admin (`stripe.refunds.create`).
- Tests end-to-end con Playwright del flujo de compra.
- CI con GitHub Actions (lint, tipos, tests).

---

## 14. README del portfolio

1. Capturas, GIF de la demo y enlace a Figma.
2. Diagrama de arquitectura y diagrama entidad-relación.
3. Sección **"Decisiones técnicas"**: cómo evitas la sobreventa, por qué reservas stock antes del pago, cómo haces idempotente el webhook, por qué el servidor ignora los precios del cliente.
4. Credenciales de prueba (admin y cliente) y la tarjeta de prueba de Stripe.
5. Instrucciones para correrlo en local (`.env.example`, migraciones, seed, Stripe CLI).
