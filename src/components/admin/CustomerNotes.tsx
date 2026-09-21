"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNote, removeNote } from "@/app/admin/actions";
import { Button, INPUT_CLASS } from "./ui";
import { moment } from "./format";

export type NoteItem = { id: number; text: string; createdAt: Date };

/**
 * Заметки о госте — то, чего нет ни в одном заказе: «аллергия на орехи»,
 * «просит стол у окна», «в прошлый раз ждал час, извинились».
 */
export function CustomerNotes({ phone, notes }: { phone: string; notes: NoteItem[] }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || pending) return;

    startTransition(async () => {
      const result = await addNote(phone, value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setText("");
      setError(null);
      router.refresh();
    });
  }

  function drop(id: number) {
    startTransition(async () => {
      const result = await removeNote(phone, id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={600}
          placeholder="Что важно помнить про гостя"
          aria-label="Новая заметка"
          className={`${INPUT_CLASS} min-w-[200px] flex-1`}
        />
        <Button type="submit" disabled={pending || !text.trim()}>
          Добавить
        </Button>
      </form>

      {error ? <p className="mt-2 text-xs text-warn">{error}</p> : null}

      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Заметок пока нет.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm">{note.text}</p>
                <p className="mt-0.5 text-[11px] tabular-nums text-ink-muted">
                  {moment(note.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => drop(note.id)}
                disabled={pending}
                aria-label="Удалить заметку"
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-ink-muted transition hover:bg-warn-tint hover:text-warn disabled:opacity-60"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
