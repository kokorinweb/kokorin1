"use client";

import { useState } from "react";
import type { SeriesPoint } from "@/lib/db/stats";
import { VIZ_BAR } from "./palette";
import { bucketLabel, compactMoney, money } from "./format";

/** Округляет верх шкалы до опрятного числа: 27 431 → 30 000. */
function niceMax(value: number): number {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

/**
 * Выручка по дням (или по часам за сегодня).
 *
 * Один ряд — один цвет и никакой легенды: цвет здесь ничего не кодирует, кроме
 * «это выручка», и заголовок это уже сказал. Сетка — сплошные волосяные линии,
 * значения читаются с оси, с подписи максимума и из подсказки на наведении.
 */
export function RevenueChart({
  points,
  granularity,
  total,
}: {
  points: SeriesPoint[];
  granularity: "hour" | "day";
  total: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(...points.map((point) => point.revenue), 0);
  const scaleMax = niceMax(max);
  const peakIndex = points.findIndex((point) => point.revenue === max && max > 0);
  // Подписей столько, чтобы они не наезжали друг на друга и на узком экране.
  const labelEvery =
    granularity === "hour" ? 3 : points.length <= 10 ? 1 : Math.ceil(points.length / 7);
  const ticks = [scaleMax, scaleMax / 2, 0];

  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Выручка</h2>
          <p className="text-xs text-slate">
            {granularity === "hour" ? "по часам, сегодня" : "по дням, без отменённых"}
          </p>
        </div>
        <p className="text-sm font-semibold text-ink-soft">{money(total)}</p>
      </div>

      <div className="mt-4 flex gap-3">
        {/* Ось значений: три опрятных отметки, больше не нужно. */}
        <div className="flex h-44 w-10 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-slate">
          {ticks.map((tick) => (
            <span key={tick}>{compactMoney(tick)}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-44">
            {/* Сетка — сплошные волосяные линии на один шаг от фона. */}
            {[0, 0.5, 1].map((fraction) => (
              <span
                key={fraction}
                aria-hidden="true"
                className="absolute inset-x-0 h-px bg-line"
                style={{ bottom: `${fraction * 100}%` }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-[2px]">
              {points.map((point, index) => {
                const height = scaleMax > 0 ? (point.revenue / scaleMax) * 100 : 0;
                const active = hovered === index;

                return (
                  <div
                    key={point.at.toISOString()}
                    // Зона наведения — вся колонка целиком, а не закрашенные пиксели.
                    className="group relative flex h-full flex-1 cursor-default items-end"
                    style={{ maxWidth: 24 }}
                    tabIndex={0}
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
                    onFocus={() => setHovered(index)}
                    onBlur={() => setHovered((current) => (current === index ? null : current))}
                    aria-label={`${bucketLabel(point.at, granularity)}: ${money(point.revenue)}, заказов ${point.orders}`}
                  >
                    {point.revenue > 0 ? (
                      <span
                        className="w-full rounded-t-[4px] transition-opacity"
                        style={{
                          height: `${Math.max(height, 1)}%`,
                          backgroundColor: VIZ_BAR,
                          opacity: hovered === null || active ? 1 : 0.55,
                        }}
                      />
                    ) : (
                      // Пустой день — тонкая заглушка: иначе колонка выглядит потерянной.
                      <span className="h-[2px] w-full rounded-t-[1px] bg-line" />
                    )}

                    {/* Подписываем только максимум: число над каждой колонкой не читает никто. */}
                    {index === peakIndex && hovered === null ? (
                      <span
                        className="pointer-events-none absolute left-1/2 z-[1] w-max -translate-x-1/2 text-[11px] font-semibold tabular-nums text-ink-soft"
                        style={{ bottom: `calc(${Math.max(height, 1)}% + 4px)` }}
                      >
                        {compactMoney(point.revenue)}
                      </span>
                    ) : null}

                    {active ? (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-left text-white shadow-lg">
                        <p className="text-sm font-semibold tabular-nums">{money(point.revenue)}</p>
                        <p className="text-[11px] text-white/70">
                          {bucketLabel(point.at, granularity)} · заказов {point.orders}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/*
            * Полоса подписей — часть контейнера, а не то, что вылезает за него.
            * Подпись шире колонки, поэтому она центрируется абсолютно и свободно
            * висит над пустыми соседями: обрезать «23.08» до «23.(» нельзя.
            */}
          <div className="mt-2 flex h-4 gap-[2px]">
            {points.map((point, index) => (
              <span
                key={point.at.toISOString()}
                className="relative flex-1"
                style={{ maxWidth: 24 }}
              >
                {index % labelEvery === 0 ? (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-slate">
                    {bucketLabel(point.at, granularity)}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Тот же ряд таблицей: значения не должны существовать только внутри подсказки. */}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-slate">Показать таблицей</summary>
        <div className="mt-2 max-h-48 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate">
              <tr>
                <th className="py-1 font-medium">{granularity === "hour" ? "Час" : "День"}</th>
                <th className="py-1 text-right font-medium">Выручка</th>
                <th className="py-1 text-right font-medium">Заказов</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {points.map((point) => (
                <tr key={point.at.toISOString()} className="border-t border-line">
                  <td className="py-1">{bucketLabel(point.at, granularity)}</td>
                  <td className="py-1 text-right">{money(point.revenue)}</td>
                  <td className="py-1 text-right">{point.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
