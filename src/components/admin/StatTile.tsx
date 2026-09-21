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
      className={`flex flex-col justify-between gap-6 rounded-3xl p-5 ${
        accent
          ? "bg-basil text-white shadow-[0_24px_60px_-40px_rgba(47,93,63,0.9)]"
          : "bg-white shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]"
      }`}
    >
      <p className={`text-sm font-medium ${accent ? "text-white/80" : "text-ink-soft"}`}>
        {label}
      </p>

      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          {/* Заглавное число — тем же sans, что и всё остальное, и без tabular-nums. */}
          <span className="text-3xl leading-none font-semibold tracking-tight">{value}</span>

          {change !== null ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                accent
                  ? "bg-white/15 text-white"
                  : good
                    ? "bg-basil/10 text-basil"
                    : "bg-terracotta/10 text-terracotta"
              }`}
            >
              {change > 0 ? "+" : ""}
              {change.toLocaleString("ru-RU")}%
            </span>
          ) : null}
        </div>

        <p className={`mt-1.5 text-xs ${accent ? "text-white/70" : "text-slate"}`}>
          {hint ?? (change === null ? "нет данных за прошлый период" : "к прошлому периоду")}
        </p>
      </div>
    </div>
  );
}
