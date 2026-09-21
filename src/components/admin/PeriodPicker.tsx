import Link from "next/link";
import { PERIODS } from "@/lib/db/stats";

/**
 * Один переключатель периода на весь экран — над всеми карточками, а не внутри
 * каждой: все числа и графики должны показывать один и тот же срез.
 */
export function PeriodPicker({ active }: { active: string }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
      {PERIODS.map((period) => (
        <Link
          key={period.id}
          href={`/admin?period=${period.id}`}
          aria-current={period.id === active ? "true" : undefined}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            period.id === active
              ? "bg-accent-tint text-accent-strong"
              : "text-ink-muted hover:bg-tint hover:text-ink"
          }`}
        >
          {period.title}
        </Link>
      ))}
    </div>
  );
}
