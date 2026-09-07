import { RESTAURANT } from "@/lib/restaurant";

/**
 * Логотип: печать-ханко с кандзи 海苔 и наборное имя.
 * Печать нарисована вектором — масштабируется и не тянет картинку.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center">
        <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <rect x="1.5" y="1.5" width="37" height="37" rx="9" fill="var(--color-shu)" />
          <rect
            x="4.5"
            y="4.5"
            width="31"
            height="31"
            rx="6.5"
            fill="none"
            stroke="rgba(20,10,6,0.35)"
            strokeWidth="1.2"
          />
        </svg>
        <span className="jp relative text-[13px] font-semibold leading-none text-[#180c06]">
          海苔
        </span>
      </span>
      {!compact ? (
        <span className="leading-none">
          <span className="display block text-[1.4rem] tracking-[0.12em] text-text">
            {RESTAURANT.name}
          </span>
          <span className="label mt-1 block text-[0.5rem] text-text-faint">
            {RESTAURANT.nameLatin} · Малая Бронная
          </span>
        </span>
      ) : null}
    </span>
  );
}
