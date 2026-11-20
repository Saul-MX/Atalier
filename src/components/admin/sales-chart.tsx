"use client";

import { useEffect, useId, useRef, useState } from "react";

import { formatPrice } from "@/lib/money";
import { axisLabel, niceTicks } from "@/lib/orders/chart-scale";
import { type DailySales, shortDayLabel } from "@/lib/orders/daily-sales";

/**
 * Ventas por día (una sola serie → sin leyenda; el título la nombra).
 * Columnas ≤ 24 px con punta redondeada de 4 px y base recta, rejilla de 1 px,
 * etiqueta directa solo en el día de más ventas, tooltip por columna (ratón y
 * teclado con ← →) y la tabla completa como alternativa accesible.
 */

const HEIGHT = 240;
const MARGIN = { top: 28, right: 8, bottom: 28, left: 56 };
const MAX_BAR = 24;
const GAP = 2;

function columnPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(4, width / 2, height);
  const bottom = y + height;
  return [
    `M${x},${bottom}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${bottom}`,
    "Z",
  ].join(" ");
}

const ordersLabel = (n: number) => `${n} ${n === 1 ? "pedido" : "pedidos"}`;

export function SalesChart({ series }: { series: DailySales[] }) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(...series.map((d) => d.revenue));
  const ticks = niceTicks(max);
  const axisMax = ticks.at(-1)!;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const slot = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.max(2, Math.min(MAX_BAR, slot - GAP));
  const yFor = (cents: number) =>
    MARGIN.top + plotHeight - (cents / axisMax) * plotHeight;
  const peak = max > 0 ? series.findIndex((d) => d.revenue === max) : -1;
  const labelEvery = slot < 18 ? 7 : 5;
  const current = active === null ? null : series[active];

  function onKeyDown(event: React.KeyboardEvent) {
    const last = series.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: Math.min(last, (active ?? -1) + 1),
      ArrowLeft: Math.max(0, (active ?? last + 1) - 1),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]!);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="relative" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="group"
            tabIndex={0}
            aria-label="Ventas diarias de los últimos 30 días. Usa las flechas izquierda y derecha para recorrer los días."
            aria-describedby={`${id}-readout`}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className="overflow-visible rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={yFor(tick)}
                  y2={yFor(tick)}
                  stroke="var(--border)"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={MARGIN.left - 8}
                  y={yFor(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {axisLabel(tick, axisMax)}
                </text>
              </g>
            ))}

            {series.map((d, i) => {
              const x = MARGIN.left + i * slot + (slot - barWidth) / 2;
              const y = yFor(d.revenue);
              const height = MARGIN.top + plotHeight - y;
              const showLabel =
                i === series.length - 1 ||
                (series.length - 1 - i) % labelEvery === 0;
              return (
                <g key={d.day}>
                  {d.revenue > 0 && (
                    <path
                      d={columnPath(x, y, barWidth, height)}
                      fill="var(--chart-1)"
                      opacity={active === null || active === i ? 1 : 0.55}
                    />
                  )}
                  {i === peak && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 8}
                      textAnchor="middle"
                      className="fill-foreground text-[11px] font-medium tabular-nums"
                    >
                      {axisLabel(d.revenue, axisMax)}
                    </text>
                  )}
                  {showLabel && (
                    <text
                      x={x + barWidth / 2}
                      y={HEIGHT - 8}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[11px]"
                    >
                      {shortDayLabel(d.day)}
                    </text>
                  )}
                  {/* Zona de acierto: toda la columna del día, más grande que la barra. */}
                  <rect
                    x={MARGIN.left + i * slot}
                    y={MARGIN.top}
                    width={slot}
                    height={plotHeight}
                    fill="transparent"
                    onPointerEnter={() => setActive(i)}
                    onPointerMove={() => setActive(i)}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {current && active !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 flex -translate-x-1/2 flex-col gap-0.5 rounded-md border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
            style={{
              left: Math.min(
                Math.max(MARGIN.left + (active + 0.5) * slot, 70),
                width - 70,
              ),
              top: Math.max(0, yFor(current.revenue) - 58),
            }}
          >
            <span className="text-sm font-semibold tabular-nums">
              {formatPrice(current.revenue)}
            </span>
            <span className="text-muted-foreground">
              {shortDayLabel(current.day)} · {ordersLabel(current.orders)}
            </span>
          </div>
        )}
      </div>

      <p id={`${id}-readout`} aria-live="polite" className="sr-only">
        {current
          ? `${shortDayLabel(current.day)}: ${formatPrice(current.revenue)}, ${ordersLabel(current.orders)}`
          : ""}
      </p>

      <details className="text-sm">
        <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">
          Ver los datos en una tabla
        </summary>
        <div className="mt-3 max-h-72 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Ventas por día, últimos 30 días
            </caption>
            <thead className="sticky top-0 bg-muted text-left">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-medium">
                  Día
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium">
                  Pedidos
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium">
                  Ventas
                </th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((d) => (
                <tr key={d.day} className="border-t">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    {shortDayLabel(d.day)}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.orders}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatPrice(d.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
