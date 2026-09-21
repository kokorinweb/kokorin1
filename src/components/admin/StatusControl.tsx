"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeStatus } from "@/app/admin/actions";
import { STATUS_META, nextStatuses, type OrderStatus } from "@/lib/status";
import type { Fulfillment } from "@/lib/order";

/**
 * Пилюля статуса, которая одновременно и переключатель.
 *
 * Доступные переходы считает та же функция, что и база, поэтому в меню не
 * появится «выдан» у заказа, который ещё готовится. Итог всё равно проверяется
 * на сервере: меню — удобство, а не защита.
 */
export function StatusControl({
  number,
  status,
  fulfillment,
  size = "sm",
}: {
  number: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const meta = STATUS_META[status];
  const options = nextStatuses(status, fulfillment);

  function move(to: OrderStatus) {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await changeStatus(number, to);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={pending || options.length === 0}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full ring-1 font-medium transition disabled:opacity-60 ${meta.pill} ${
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

      {open ? (
        <>
          {/* Клик мимо меню закрывает его — без библиотеки поповеров. */}
          <button
            type="button"
            aria-label="Закрыть меню статусов"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl"
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="menuitem"
                onClick={() => move(option)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-panel"
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

      {error ? <p className="mt-1 text-xs text-terracotta">{error}</p> : null}
    </div>
  );
}
