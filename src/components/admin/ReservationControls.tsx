"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReservationAction, setReservationStatusAction } from "@/app/admin/actions";
import {
  RESERVATION_AREAS,
  RESERVATION_META,
  nextReservationStatuses,
  type ReservationStatus,
} from "@/lib/reservation";
import { RESTAURANT } from "@/lib/restaurant";
import { Button, Field, INPUT_CLASS, SELECT_CLASS } from "./ui";

/** Сегодняшняя дата по времени заведения — для значения по умолчанию в форме. */
function todayInRestaurant(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: RESTAURANT.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ReservationForm() {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    const input = {
      guestName: String(data.get("guestName") ?? ""),
      phone: String(data.get("phone") ?? ""),
      date: String(data.get("date") ?? ""),
      time: String(data.get("time") ?? ""),
      guests: String(data.get("guests") ?? ""),
      area: String(data.get("area") ?? ""),
      comment: String(data.get("comment") ?? ""),
    };

    startTransition(async () => {
      const result = await createReservationAction(input);
      if (!result.ok) {
        setError(result.error);
        setSaved(false);
        return;
      }
      setError(null);
      setSaved(true);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-3">
      <Field label="Имя гостя">
        <input name="guestName" required maxLength={60} className={INPUT_CLASS} />
      </Field>

      <Field label="Телефон">
        <input
          name="phone"
          required
          inputMode="tel"
          placeholder="+7 (900) 000-00-00"
          className={INPUT_CLASS}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата">
          <input
            type="date"
            name="date"
            required
            defaultValue={todayInRestaurant()}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Время">
          <input type="time" name="time" required defaultValue="19:00" className={INPUT_CLASS} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Гостей">
          <input
            type="number"
            name="guests"
            min={1}
            max={20}
            required
            defaultValue={2}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Зона">
          <select name="area" defaultValue="" className={`${SELECT_CLASS} w-full`}>
            <option value="">Не важно</option>
            {RESERVATION_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Комментарий" hint="день рождения, детский стул, аллергия">
        <input name="comment" maxLength={400} className={INPUT_CLASS} />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Сохраняем…" : "Записать бронь"}
      </Button>

      {error ? <p className="text-xs text-warn">{error}</p> : null}
      {saved && !error ? <p className="text-xs text-accent-strong">Броня записана.</p> : null}
    </form>
  );
}

/** Статус брони: та же механика меню, что у заказов — `fixed` от координат кнопки. */
export function ReservationStatusControl({
  id,
  status,
}: {
  id: number;
  status: ReservationStatus;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spot, setSpot] = useState<{ top: number; left: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const meta = RESERVATION_META[status];
  const options = nextReservationStatuses(status);

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
      const width = 200;
      setSpot({
        top: rect.bottom + 6,
        left: Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8),
      });
    }
    setOpen(true);
  }

  function move(to: ReservationStatus) {
    setOpen(false);
    startTransition(async () => {
      const result = await setReservationStatusAction(id, to);
      if (!result.ok) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={pending || options.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition disabled:opacity-60 ${meta.pill}`}
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
            aria-label="Закрыть меню"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            style={{ top: spot.top, left: spot.left, width: 200 }}
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
                  className={`h-1.5 w-1.5 rounded-full ${RESERVATION_META[option].dot}`}
                />
                {RESERVATION_META[option].action}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {error ? <p className="mt-1 text-xs text-warn">{error}</p> : null}
    </div>
  );
}
