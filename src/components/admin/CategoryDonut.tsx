"use client";

import { useState } from "react";
import type { CategorySlice } from "@/lib/db/stats";
import { seriesColor } from "./palette";
import { money, percent } from "./format";

const SIZE = 172;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Разрыв между сегментами — фоном, а не обводкой. */
const GAP = 2;

/**
 * Продажи по категориям меню.
 *
 * Донат здесь оправдан только потому, что категорий ровно шесть и вопрос —
 * «из чего сложилась выручка», а не «что больше на 3%». Близкие доли на глаз
 * по кольцу не сравнить, поэтому рядом легенда с процентами и рублями:
 * цвет — не единственный канал, и часть слотов палитры не дотягивает до
 * контраста 3:1 к белому фону, что как раз и требует подписей.
 */
export function CategoryDonut({
  slices,
  total,
}: {
  slices: CategorySlice[];
  total: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  let offset = 0;

  return (
    <section className="@container rounded-2xl border border-line bg-white p-5">
      <h2 className="text-base font-semibold">Продажи по категориям</h2>
      <p className="text-xs text-ink-muted">доля в выручке за период</p>

      {slices.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">За период нет ни одного выданного заказа.</p>
      ) : (
        // Контейнерные запросы, а не ширина окна: карточка живёт и в треть экрана,
        // и на всю ширину — легенда решает по своей ширине, а не по чужой.
        <div className="mt-4 flex flex-col items-center gap-5 @md:flex-row @md:items-center">
          <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              width={SIZE}
              height={SIZE}
              role="img"
              aria-label="Доли категорий в выручке"
            >
              <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
                {slices.map((slice, index) => {
                  const length = Math.max(slice.share * CIRCUMFERENCE - GAP, 0.5);
                  const dash = `${length} ${CIRCUMFERENCE - length}`;
                  const rotation = offset;
                  offset += slice.share * CIRCUMFERENCE;
                  const active = hovered === slice.id;

                  return (
                    <circle
                      key={slice.id}
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      stroke={seriesColor(index)}
                      strokeWidth={active ? STROKE + 4 : STROKE}
                      strokeDasharray={dash}
                      strokeDashoffset={-rotation}
                      opacity={hovered === null || active ? 1 : 0.5}
                      onMouseEnter={() => setHovered(slice.id)}
                      onMouseLeave={() =>
                        setHovered((current) => (current === slice.id ? null : current))
                      }
                      // Анимируем только прозрачность: толщину сегмента меняем сразу,
                      // чтобы не гонять геометрию через переход.
                      style={{ transition: "opacity 120ms" }}
                    />
                  );
                })}
              </g>
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg leading-none font-semibold tracking-tight">
                {money(total)}
              </span>
              <span className="mt-1 text-[11px] text-ink-muted">по позициям</span>
            </div>
          </div>

          {/* Легенда обязательна: она же и таблица значений. */}
          <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
            {slices.map((slice, index) => (
              <li
                key={slice.id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1 transition ${
                  hovered === slice.id ? "bg-tint" : ""
                }`}
                onMouseEnter={() => setHovered(slice.id)}
                onMouseLeave={() =>
                  setHovered((current) => (current === slice.id ? null : current))
                }
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: seriesColor(index) }}
                />
                <span className="min-w-[6rem] flex-1 truncate text-ink-soft">{slice.title}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {percent(slice.share)}
                </span>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-ink-muted">
                  {money(slice.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
