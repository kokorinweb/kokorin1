import { delta } from "@/lib/db/stats";

/**
 * Плитка показателя: число, подпись и сравнение с прошлым периодом.
 *
 * Если сравнивать не с чем (в прошлом периоде ноль) — честно пишем «нет данных»,
 * а не рисуем «+100%». На пустой базе первый месяц так и будет, это нормально.
 */
export function StatTile({
  label,
  value,
  current,
  previous,
  hint,
  accent = false,
  /** Для отмен рост — это плохо, а не хорошо. */
  inverted = false,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  hint?: string;
  accent?: boolean;
  inverted?: boolean;
}) {
  const change = delta(current, previous);
  const good = change === null ? null : inverted ? change <= 0 : change >= 0;

  return (
    <div
      className={`flex flex-col justify-between gap-5 rounded-2xl border p-5 ${
        accent ? "border-accent/25 bg-accent-tint" : "border-line bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${accent ? "text-accent-strong" : "text-ink-soft"}`}>
        {label}
      </p>

      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          {/* Крупное число — тем же sans, что и всё остальное, и без tabular-nums:
              равноширинные цифры на этом кегле выглядят разреженными. */}
          <span
            className={`text-[1.875rem] leading-none font-bold tracking-tight ${
              accent ? "text-accent-strong" : ""
            }`}
          >
            {value}
          </span>

          {change !== null ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                good ? "bg-accent-tint text-accent-strong" : "bg-warn-tint text-warn"
              } ${accent && good ? "bg-white/70" : ""}`}
            >
              {change > 0 ? "+" : ""}
              {change.toLocaleString("ru-RU")}%
            </span>
          ) : null}
        </div>

        <p className={`mt-1.5 text-[11px] ${accent ? "text-accent-strong/75" : "text-ink-muted"}`}>
          {hint ?? (change === null ? "нет данных за прошлый период" : "к прошлому периоду")}
        </p>
      </div>
    </div>
  );
}
