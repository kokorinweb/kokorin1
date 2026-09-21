"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleAvailability } from "@/app/admin/actions";
import { INPUT_CLASS } from "./ui";

/**
 * Переключатель одного блюда. Причина — необязательный текст: он попадает и в
 * подпись на витрине, и в промпт ИИ, поэтому пишется человеческим языком
 * («закончились мидии»), а не кодом.
 */
export function StopListToggle({
  itemId,
  itemName,
  available,
  reason,
}: {
  itemId: string;
  itemName: string;
  available: boolean;
  reason: string;
}) {
  const [draft, setDraft] = useState(reason);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function apply(next: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleAvailability(itemId, next, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {available ? (
        <>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="причина (необязательно)"
            aria-label={`Причина, почему нет: ${itemName}`}
            maxLength={80}
            className={`${INPUT_CLASS} w-44 py-1.5 text-xs`}
          />
          <button
            type="button"
            onClick={() => apply(false)}
            disabled={pending}
            className="rounded-xl bg-warn-tint px-3 py-2 text-xs font-bold text-warn transition hover:bg-warn/15 disabled:opacity-60"
          >
            {pending ? "…" : "Закончилось"}
          </button>
        </>
      ) : (
        <>
          {reason ? <span className="text-xs text-ink-muted">{reason}</span> : null}
          <button
            type="button"
            onClick={() => apply(true)}
            disabled={pending}
            className="rounded-xl bg-accent-tint px-3 py-2 text-xs font-bold text-accent-strong transition hover:bg-accent/15 disabled:opacity-60"
          >
            {pending ? "…" : "Вернуть в меню"}
          </button>
        </>
      )}
      {error ? <p className="w-full text-right text-xs text-warn">{error}</p> : null}
    </div>
  );
}
