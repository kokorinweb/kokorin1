"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeStatus } from "@/app/admin/actions";
import { STATUS_META, nextStatuses, type OrderStatus } from "@/lib/status";
import type { Fulfillment } from "@/lib/order";

/**
 * Пилюля статуса, которая одновременно и переключатель.
 *
 * Меню позиционируется от координат кнопки и висит на `fixed`: таблица заказов
 * прокручивается по горизонтали, а внутри прокручиваемого контейнера абсолютное
 * меню обрезается по его краю.
 *
 * Доступные переходы считает та же функция, что и база. Итог всё равно проверяется
 * на сервере: меню — удобство, а не защита.
 */
export function StatusControl({
  number,
  status,
  fulfillment,
  size = "sm",
  onChanged,
}: {
  number: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  size?: "sm" | "md";
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spot, setSpot] = useState<{ top: number; left: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const meta = STATUS_META[status];
  const options = nextStatuses(status, fulfillment);

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 216;
      setSpot({
        top: rect.bottom + 6,
        left: Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8),
      });
    }
    setOpen(true);
  }

  function move(to: OrderStatus) {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await changeStatus(number, to);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChanged?.();
      router.refresh();
    });
  }

  return (
    <div className="inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        disabled={pending || options.length === 0}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 transition disabled:opacity-60 ${meta.pill} ${
          size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
        }`}
      >
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {pending ? "…" : meta.label}
        {options.length > 0 ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3 w-3 opacity-60"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        ) : null}
      </button>

      {open && spot ? (
        <>
          <button
            type="button"
            aria-label="Закрыть меню статусов"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            style={{ top: spot.top, left: spot.left, width: 216 }}
            className="fixed z-30 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-[0_18px_40px_-20px_rgba(38,33,25,0.35)]"
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="menuitem"
                onClick={() => move(option)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-tint"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${STATUS_META[option].dot}`}
                />
                {STATUS_META[option].action}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {error ? <p className="mt-1 text-xs text-warn">{error}</p> : null}
    </div>
  );
}
