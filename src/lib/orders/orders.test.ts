import { describe, expect, it } from "vitest";

import {
  addDays,
  fillDailySeries,
  shortDayLabel,
  storeDay,
} from "./daily-sales";
import { axisLabel, niceTicks } from "./chart-scale";
import {
  isSold,
  nextFulfillmentStatus,
  ORDER_STATUSES,
  orderIdQuery,
  orderNumber,
} from "./status";

describe("nextFulfillmentStatus", () => {
  it("el admin solo avanza el envío: PAID → SHIPPED → DELIVERED", () => {
    expect(nextFulfillmentStatus("PAID")).toBe("SHIPPED");
    expect(nextFulfillmentStatus("SHIPPED")).toBe("DELIVERED");
  });

  it.each(["PENDING", "DELIVERED", "CANCELLED", "EXPIRED"] as const)(
    "%s no tiene transición manual",
    (status) => {
      expect(nextFulfillmentStatus(status)).toBeNull();
    },
  );

  it("solo PAID/SHIPPED/DELIVERED cuentan como venta", () => {
    expect(ORDER_STATUSES.filter(isSold)).toEqual([
      "PAID",
      "SHIPPED",
      "DELIVERED",
    ]);
  });
});

describe("serie diaria de ventas", () => {
  it("usa el día de la tienda (CDMX), no el de UTC", () => {
    // 2026-11-21 04:30 UTC = 2026-11-20 22:30 en CDMX
    expect(storeDay(new Date("2026-11-21T04:30:00Z"))).toBe("2026-11-20");
  });

  it("suma días cruzando meses y años", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("rellena con ceros y termina en el último día", () => {
    const series = fillDailySeries(
      [
        { day: "2026-11-18", revenue: 50_000, orders: 1 },
        { day: "2026-11-20", revenue: 120_000, orders: 2 },
        { day: "2026-10-01", revenue: 999, orders: 9 }, // fuera de rango
      ],
      "2026-11-20",
      5,
    );
    expect(series).toEqual([
      { day: "2026-11-16", revenue: 0, orders: 0 },
      { day: "2026-11-17", revenue: 0, orders: 0 },
      { day: "2026-11-18", revenue: 50_000, orders: 1 },
      { day: "2026-11-19", revenue: 0, orders: 0 },
      { day: "2026-11-20", revenue: 120_000, orders: 2 },
    ]);
  });

  it("etiqueta corta en español", () => {
    expect(shortDayLabel("2026-11-20")).toBe("20 nov");
  });
});

describe("escala de la gráfica", () => {
  it.each([
    [134_700, [0, 50_000, 100_000, 150_000]],
    [1_000_000, [0, 250_000, 500_000, 750_000, 1_000_000]],
    [3_210_000, [0, 1_000_000, 2_000_000, 3_000_000, 4_000_000]],
    [0, [0, 100_000]],
  ])("niceTicks(%d) cubre el máximo con pasos redondos", (max, ticks) => {
    expect(niceTicks(max)).toEqual(ticks);
    expect(niceTicks(max).at(-1)).toBeGreaterThanOrEqual(max);
  });

  it("etiquetas completas bajo $10,000 y compactas por encima", () => {
    expect(axisLabel(250_000, 750_000)).toBe("$2,500");
    expect(axisLabel(250_000, 1_000_000)).toBe("$2.5K"); // el eje llega a $10,000
    expect(axisLabel(1_250_000, 4_000_000)).toBe("$12.5K");
    expect(axisLabel(2_000_000, 4_000_000)).toBe("$20K");
    expect(axisLabel(0, 4_000_000)).toBe("$0");
  });
});

describe("número de pedido", () => {
  it("muestra los últimos 8 caracteres y la búsqueda acepta lo que se ve", () => {
    const id = "cmwpeigbk000ah0akmjjmkojd";
    expect(orderNumber(id)).toBe("#MJJMKOJD");
    expect(id).toContain(orderIdQuery(` ${orderNumber(id)} `));
  });
});
