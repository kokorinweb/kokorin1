"use client";

import { ZONES, type TableAvailability, type ZoneId } from "@/lib/booking";
import { plural } from "./CartBar";

/**
 * Схема зала: гость сам тыкает в свободный стол.
 *
 * Фон комнаты рисуется SVG, а сами столы — обычные <button> поверх него.
 * Так они получают нормальный фокус, размер под палец и понятные aria-подписи,
 * чего от кликабельных <circle> внутри SVG добиться заметно сложнее.
 */

/** Зоны в процентах от ширины/высоты плана. Не пересекаются — иначе схема нечитаема. */
const ZONE_RECTS: Record<ZoneId, { x: number; y: number; w: number; h: number; label: string }> = {
  window: { x: 5, y: 18, w: 17, h: 58, label: "У окна" },
  bar: { x: 57, y: 12, w: 38, h: 14, label: "Бар" },
  main: { x: 25, y: 20, w: 33, h: 56, label: "Основной зал" },
  vip: { x: 68, y: 32, w: 26, h: 44, label: "VIP" },
  terrace: { x: 16, y: 79, w: 70, h: 14, label: "Терраса" },
};

export function FloorPlan({
  tables,
  selected,
  onSelect,
  guests,
  zoneFilter,
}: {
  tables: TableAvailability[];
  selected: number | null;
  onSelect: (tableId: number) => void;
  guests: number;
  zoneFilter: ZoneId | "all";
}) {
  return (
    <div>
      <div className="rail overflow-x-auto">
        <div className="relative aspect-[16/10] min-w-[640px]">
          <svg
            viewBox="0 0 160 100"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {/* Пол */}
            <rect x="1" y="1" width="158" height="98" rx="4" fill="#101014" stroke="rgba(255,255,255,0.08)" />
            {(Object.keys(ZONE_RECTS) as ZoneId[]).map((zone) => {
              const rect = ZONE_RECTS[zone];
              const dimmed = zoneFilter !== "all" && zoneFilter !== zone;
              return (
                <g key={zone} opacity={dimmed ? 0.28 : 1}>
                  <rect
                    x={rect.x * 1.6}
                    y={rect.y}
                    width={rect.w * 1.6}
                    height={rect.h}
                    rx="3"
                    fill={zone === "vip" ? "rgba(255,90,43,0.07)" : "rgba(255,255,255,0.035)"}
                    stroke="rgba(255,255,255,0.07)"
                  />
                  <text
                    x={rect.x * 1.6 + 3}
                    y={rect.y + 5.5}
                    fill="rgba(255,255,255,0.34)"
                    fontSize="3.4"
                    letterSpacing="0.4"
                    fontFamily="var(--font-mono)"
                  >
                    {rect.label.toUpperCase()}
                  </text>
                </g>
              );
            })}
            {/* Вход и открытая кухня — ориентиры, чтобы схема читалась как зал */}
            <rect x="63" y="94.5" width="34" height="4.5" rx="1.6" fill="rgba(255,90,43,0.45)" />
            <text x="80" y="97.8" fill="#0a0a0c" fontSize="2.8" textAnchor="middle" fontFamily="var(--font-mono)">
              ВХОД
            </text>
            <rect x="10" y="3" width="140" height="7" rx="2" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.07)" />
            <text x="80" y="7.9" fill="rgba(255,255,255,0.3)" fontSize="3.2" textAnchor="middle" fontFamily="var(--font-mono)">
              ОТКРЫТАЯ КУХНЯ
            </text>
          </svg>

          {tables.map((table) => {
            const dimmed = zoneFilter !== "all" && zoneFilter !== table.zone;
            const unavailable = !table.free || table.tooSmall;
            const isSelected = selected === table.tableId;
            const size = table.seats >= 6 ? 52 : table.seats >= 4 ? 46 : 40;

            const seats = `${table.seats} ${plural(table.seats, "место", "места", "мест")}`;
            const reason = !table.free
              ? "занят"
              : table.tooSmall
                ? `мало мест: ${seats}`
                : `свободен, ${seats}`;

            return (
              <button
                key={table.tableId}
                type="button"
                disabled={unavailable}
                onClick={() => onSelect(table.tableId)}
                aria-pressed={isSelected}
                aria-label={`Стол №${table.tableId}, ${reason}`}
                title={`Стол №${table.tableId} · ${reason}`}
                style={{
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  width: size,
                  height: table.shape === "bar" ? 30 : size,
                  opacity: dimmed ? 0.3 : 1,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 border text-[13px] font-semibold transition-all duration-200 ${
                  table.shape === "round" ? "rounded-full" : table.shape === "bar" ? "rounded-md" : "rounded-lg"
                } ${
                  isSelected
                    ? "z-10 scale-110 border-shu bg-shu text-ink shadow-[0_0_0_5px_rgba(255,90,43,0.22)]"
                    : unavailable
                      ? "cursor-not-allowed border-line bg-ink-3 text-text-faint line-through"
                      : "cursor-pointer border-jade/60 bg-jade/15 text-text hover:scale-105 hover:border-jade hover:bg-jade/30"
                }`}
              >
                {table.tableId}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-dim">
        <Legend className="border-jade/60 bg-jade/15">свободен</Legend>
        <Legend className="border-shu bg-shu">выбран</Legend>
        <Legend className="border-line bg-ink-3">занят или мал для {guests} гостей</Legend>
      </ul>
    </div>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`inline-block h-3.5 w-3.5 rounded-full border ${className}`} />
      {children}
    </li>
  );
}

export function zoneTitle(zone: ZoneId): string {
  return ZONES.find((row) => row.id === zone)?.title ?? zone;
}
