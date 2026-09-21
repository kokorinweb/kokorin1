import Link from "next/link";
import { PERIODS } from "@/lib/db/stats";

/**
 * Один переключатель периода на весь экран — над всеми карточками, а не внутри
 * каждой: все числа и графики должны показывать один и тот же срез.
 */
export function PeriodPicker({ active }: { active: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-panel p-1">
      {PERIODS.map((period) => (
        <Link
          key={period.id}
          href={`/admin?period=${period.id}`}
          aria-current={period.id === active ? "true" : undefined}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            period.id === active
              ? "bg-white text-ink shadow-sm"
              : "text-slate hover:text-ink"
          }`}
        >
          {period.title}
        </Link>
      ))}
    </div>
  );
}
