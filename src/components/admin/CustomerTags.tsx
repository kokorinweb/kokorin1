"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleTag } from "@/app/admin/actions";
import { CUSTOMER_TAGS } from "@/lib/tags";

/**
 * Метки гостя. Нажатие сразу пишет в базу: отдельная кнопка «сохранить» на пяти
 * переключателях — лишний шаг, который нечего подтверждать.
 */
export function CustomerTags({ phone, active }: { phone: string; active: string[] }) {
  const [current, setCurrent] = useState(active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(tag: string) {
    const on = !current.includes(tag);
    setCurrent((list) => (on ? [...list, tag] : list.filter((item) => item !== tag)));
    setError(null);

    startTransition(async () => {
      const result = await toggleTag(phone, tag, on);
      if (!result.ok) {
        setError(result.error);
        setCurrent((list) => (on ? list.filter((item) => item !== tag) : [...list, tag]));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {CUSTOMER_TAGS.map((tag) => {
          const on = current.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              disabled={pending}
              aria-pressed={on}
              title={tag.hint}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition disabled:opacity-60 ${
                on ? tag.pill : "bg-white text-ink-muted ring-line hover:bg-tint"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-warn">{error}</p> : null}
    </div>
  );
}
