import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Flujo de pago contra Postgres real: reserva de stock, 409, webhook
 * idempotente, expiración y cron. Stripe se simula, pero las firmas de los
 * webhooks se generan y verifican con el SDK real.
 */

const fake = vi.hoisted(() => {
  let counter = 0;
  const sessions = {
    create: vi.fn(),
    retrieve: vi.fn(),
    expire: vi.fn(),
  };
  const defaultCreate = async () => {
    counter += 1;
    return {
      id: `cs_test_integration${counter}`,
      url: `https://checkout.stripe.com/c/pay/cs_test_integration${counter}`,
    };
  };
  return { sessions, defaultCreate };
});

vi.mock("@/lib/stripe", async () => {
  const { default: RealStripe } = await import("stripe");
  const real = new RealStripe("sk_test_integration");
  return {
    stripe: () => ({
      checkout: { sessions: fake.sessions },
      webhooks: real.webhooks,
    }),
  };
});
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock("@/server/auth/guards", () => ({
  getSession: vi.fn(async () => null),
}));

const { prisma } = await import("@/lib/prisma");
const { POST: checkout } = await import("@/app/api/checkout/route");
const { POST: webhook } = await import("@/app/api/stripe/webhook/route");
const { GET: cron } = await import("@/app/api/cron/expire-orders/route");

const signer = new Stripe("sk_test_integration").webhooks;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "OrderItem", "Order", "ProductVariant", "ProductImage", "Product", "Category", "StripeEvent" CASCADE',
  );
}

let fixture = 0;
async function createVariant(stock: number, basePrice = 100_000) {
  fixture += 1;
  const product = await prisma.product.create({
    data: {
      name: `Producto ${fixture}`,
      slug: `producto-${fixture}`,
      description: "Producto de prueba de integración.",
      basePrice,
      category: {
        create: { name: `Categoría ${fixture}`, slug: `categoria-${fixture}` },
      },
      variants: { create: { size: "M", color: "Negro", stock } },
    },
    select: { variants: { select: { id: true } } },
  });
  return product.variants[0]!.id;
}

const stockOf = async (variantId: string) =>
  (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
    .stock;

function postCheckout(items: unknown[]) {
  return checkout(
    new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    }),
  );
}

/** Crea una orden PENDING a través del endpoint real. */
async function pendingOrder(variantId: string, quantity = 1) {
  const response = await postCheckout([{ variantId, quantity }]);
  expect(response.status).toBe(200);
  return prisma.order.findFirstOrThrow({
    where: { items: { some: { variantId } } },
    orderBy: { createdAt: "desc" },
  });
}

type SessionFields = Partial<Stripe.Checkout.Session>;

function sessionObject(
  order: { id: string; stripeSessionId: string | null },
  fields: SessionFields = {},
) {
  return {
    id: order.stripeSessionId,
    object: "checkout.session",
    metadata: { orderId: order.id },
    status: "complete",
    payment_status: "paid",
    payment_intent: "pi_integration",
    customer_email: null,
    customer_details: { email: "invitado@example.com" },
    collected_information: {
      shipping_details: {
        name: "Ana López",
        address: {
          line1: "Av. Reforma 222",
          line2: null,
          city: "CDMX",
          state: "CDMX",
          postal_code: "06600",
          country: "MX",
        },
      },
    },
    ...fields,
  };
}

let eventCounter = 0;
function webhookRequest(
  type: string,
  object: unknown,
  { id, signature }: { id?: string; signature?: string } = {},
) {
  eventCounter += 1;
  const payload = JSON.stringify({
    id: id ?? `evt_integration_${eventCounter}`,
    object: "event",
    type,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    api_version: "2026-10-28.endive",
    pending_webhooks: 0,
    request: null,
    data: { object },
  });
  return new Request("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    headers: {
      "stripe-signature":
        signature ??
        signer.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }),
    },
    body: payload,
  });
}

beforeEach(async () => {
  await resetDb();
  fake.sessions.create.mockReset().mockImplementation(fake.defaultCreate);
  fake.sessions.retrieve.mockReset();
  fake.sessions.expire.mockReset();
});

afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

// ─── Reserva de stock ────────────────────────────────────────────────────────

describe("POST /api/checkout — reserva de stock", () => {
  it("stock = 1 y 20 peticiones simultáneas → 1 éxito, 19 × 409, stock 0", async () => {
    const variantId = await createVariant(1);

    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        postCheckout([{ variantId, quantity: 1 }]),
      ),
    );
    const statuses = responses.map((r) => r.status);

    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(19);
    expect(await stockOf(variantId)).toBe(0);
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.orderItem.count()).toBe(1);
    expect(fake.sessions.create).toHaveBeenCalledTimes(1);

    const conflict = await responses.find((r) => r.status === 409)!.json();
    expect(conflict.variants).toEqual([
      { variantId, name: expect.any(String), available: 0 },
    ]);
  });

  it("es todo o nada: si una línea no alcanza, no se reserva ninguna", async () => {
    const plenty = await createVariant(5);
    const scarce = await createVariant(1);

    const response = await postCheckout([
      { variantId: plenty, quantity: 2 },
      { variantId: scarce, quantity: 2 },
    ]);

    expect(response.status).toBe(409);
    expect((await response.json()).variants).toEqual([
      { variantId: scarce, name: expect.any(String), available: 1 },
    ]);
    expect(await stockOf(plenty)).toBe(5);
    expect(await stockOf(scarce)).toBe(1);
    expect(await prisma.order.count()).toBe(0);
  });

  it("ignora los precios del cliente y relee la BD (con envío)", async () => {
    const variantId = await createVariant(3, 59_900);

    const response = await postCheckout([
      { variantId, quantity: 2, unitPrice: 1, price: 1 },
    ]);
    expect(response.status).toBe(200);

    const order = await prisma.order.findFirstOrThrow({
      include: { items: true },
    });
    expect(order).toMatchObject({
      status: "PENDING",
      subtotal: 119_800,
      shippingCost: 14_900,
      total: 134_700,
      currency: "mxn",
    });
    expect(order.items[0]).toMatchObject({ quantity: 2, price: 59_900 });

    const params = fake.sessions.create.mock.calls[0]![0];
    expect(params.line_items[0].price_data.unit_amount).toBe(59_900);
    expect(params.metadata).toEqual({ orderId: order.id });
    expect(params.expires_at - Date.now() / 1000).toBeGreaterThanOrEqual(
      30 * 60,
    );
    expect(order.stripeSessionId).toMatch(/^cs_test_integration\d+$/);
  });

  it("un producto inactivo o una variante inexistente → 409 sin reservar", async () => {
    const variantId = await createVariant(5);
    await prisma.product.updateMany({ data: { active: false } });

    const response = await postCheckout([
      { variantId, quantity: 1 },
      { variantId: "no-existe", quantity: 1 },
    ]);
    expect(response.status).toBe(409);
    expect(await stockOf(variantId)).toBe(5);
  });

  it("si Stripe falla: 502, stock devuelto y orden CANCELLED", async () => {
    const variantId = await createVariant(2);
    fake.sessions.create.mockRejectedValueOnce(new Error("Stripe caído"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await postCheckout([{ variantId, quantity: 2 }]);

    expect(response.status).toBe(502);
    expect(await stockOf(variantId)).toBe(2);
    expect((await prisma.order.findFirstOrThrow()).status).toBe("CANCELLED");
  });

  it("rechaza cuerpos inválidos (400) y no-JSON (415)", async () => {
    expect((await postCheckout([])).status).toBe(400);
    expect((await postCheckout([{ variantId: "x", quantity: 0 }])).status).toBe(
      400,
    );
    const notJson = await checkout(
      new Request("http://localhost:3000/api/checkout", {
        method: "POST",
        body: "items=1",
      }),
    );
    expect(notJson.status).toBe(415);
  });
});

// ─── Webhook ─────────────────────────────────────────────────────────────────

describe("POST /api/stripe/webhook", () => {
  it("rechaza firmas inválidas o ausentes (400)", async () => {
    const response = await webhook(
      webhookRequest(
        "checkout.session.completed",
        {},
        { signature: "t=1,v1=nope" },
      ),
    );
    expect(response.status).toBe(400);
  });

  it("completed + paid → PAID con correo, pago y dirección", async () => {
    const variantId = await createVariant(3);
    const order = await pendingOrder(variantId);

    const response = await webhook(
      webhookRequest("checkout.session.completed", sessionObject(order)),
    );
    expect(response.status).toBe(200);

    const paid = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(paid).toMatchObject({
      status: "PAID",
      email: "invitado@example.com",
      paymentIntentId: "pi_integration",
      shippingName: "Ana López",
      shippingZip: "06600",
      shippingCountry: "MX",
    });
    expect(paid.paidAt).toBeInstanceOf(Date);
    expect(await stockOf(variantId)).toBe(2);
  });

  it("el mismo evento procesado dos veces no duplica efectos", async () => {
    const variantId = await createVariant(3);
    const order = await pendingOrder(variantId);
    const session = sessionObject(order);

    const first = await webhook(
      webhookRequest("checkout.session.completed", session, { id: "evt_dup" }),
    );
    const paidAt = (
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    ).paidAt;
    const second = await webhook(
      webhookRequest("checkout.session.completed", session, { id: "evt_dup" }),
    );

    expect(await first.json()).toMatchObject({ status: "processed" });
    expect(await second.json()).toMatchObject({ status: "duplicate" });
    expect(second.status).toBe(200);
    expect(await prisma.stripeEvent.count()).toBe(1);
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(after.paidAt).toEqual(paidAt);
  });

  it("entregas duplicadas simultáneas: solo una se procesa", async () => {
    const variantId = await createVariant(3);
    const order = await pendingOrder(variantId);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        webhook(
          webhookRequest(
            "checkout.session.expired",
            sessionObject(order, {
              status: "expired",
              payment_status: "unpaid",
            }),
            {
              id: "evt_race",
            },
          ),
        ).then((r) => r.json()),
      ),
    );

    expect(results.filter((r) => r.status === "processed")).toHaveLength(1);
    expect(results.filter((r) => r.status === "duplicate")).toHaveLength(4);
    // El stock se devuelve una sola vez.
    expect(await stockOf(variantId)).toBe(3);
  });

  it("completed sin pagar (payment_status ≠ paid) no marca PAID", async () => {
    const variantId = await createVariant(3);
    const order = await pendingOrder(variantId);

    await webhook(
      webhookRequest(
        "checkout.session.completed",
        sessionObject(order, { payment_status: "unpaid" }),
      ),
    );
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe("PENDING");
  });

  it("expired → EXPIRED y devuelve el stock; repetirlo no lo devuelve dos veces", async () => {
    const variantId = await createVariant(3);
    const order = await pendingOrder(variantId, 2);
    expect(await stockOf(variantId)).toBe(1);

    const expired = sessionObject(order, {
      status: "expired",
      payment_status: "unpaid",
    });
    await webhook(webhookRequest("checkout.session.expired", expired));
    await webhook(webhookRequest("checkout.session.expired", expired)); // otro event.id

    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe("EXPIRED");
    expect(await stockOf(variantId)).toBe(3);
  });

  it("ignora sesiones que no corresponden a la orden de la metadata", async () => {
    const variantId = await createVariant(3);
    const order = await pendingOrder(variantId);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await webhook(
      webhookRequest(
        "checkout.session.completed",
        sessionObject(order, { id: "cs_test_otra_sesion" }),
      ),
    );
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe("PENDING");
  });
});

// ─── Cron ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/expire-orders", () => {
  const cronRequest = (secret = process.env.CRON_SECRET) =>
    new Request("http://localhost:3000/api/cron/expire-orders", {
      headers: { authorization: `Bearer ${secret}` },
    });

  async function overdue(order: { id: string }) {
    await prisma.order.update({
      where: { id: order.id },
      data: { expiresAt: new Date(Date.now() - 60 * 60_000) },
    });
  }

  it("401 sin el secreto correcto", async () => {
    expect((await cron(cronRequest("incorrecto"))).status).toBe(401);
    expect(
      (await cron(new Request("http://localhost:3000/api/cron/expire-orders")))
        .status,
    ).toBe(401);
  });

  it("expira en Stripe la sesión abierta y libera el stock", async () => {
    const variantId = await createVariant(2);
    const order = await pendingOrder(variantId, 2);
    await overdue(order);
    fake.sessions.retrieve.mockResolvedValue(
      sessionObject(order, { status: "open", payment_status: "unpaid" }),
    );
    fake.sessions.expire.mockResolvedValue(
      sessionObject(order, { status: "expired", payment_status: "unpaid" }),
    );

    const response = await cron(cronRequest());

    expect(await response.json()).toMatchObject({
      checked: 1,
      expired: 1,
      paid: 0,
    });
    expect(fake.sessions.expire).toHaveBeenCalledWith(order.stripeSessionId);
    expect(await stockOf(variantId)).toBe(2);
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe("EXPIRED");

    // El webhook de expiración que llega después no devuelve el stock otra vez.
    await webhook(
      webhookRequest(
        "checkout.session.expired",
        sessionObject(order, { status: "expired", payment_status: "unpaid" }),
      ),
    );
    expect(await stockOf(variantId)).toBe(2);
  });

  it("si la sesión se pagó y el webhook se perdió, marca PAID (sin liberar)", async () => {
    const variantId = await createVariant(2);
    const order = await pendingOrder(variantId);
    await overdue(order);
    fake.sessions.retrieve.mockResolvedValue(sessionObject(order));

    const response = await cron(cronRequest());

    expect(await response.json()).toMatchObject({ paid: 1, expired: 0 });
    expect(fake.sessions.expire).not.toHaveBeenCalled();
    expect(await stockOf(variantId)).toBe(1);
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe("PAID");
  });

  it("no toca órdenes que aún no vencen", async () => {
    const variantId = await createVariant(2);
    await pendingOrder(variantId);

    const response = await cron(cronRequest());

    expect(await response.json()).toMatchObject({ checked: 0 });
    expect(fake.sessions.retrieve).not.toHaveBeenCalled();
    expect(await stockOf(variantId)).toBe(1);
  });
});
