"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FloorPlan } from "./FloorPlan";
import { DishCard } from "./DishCard";
import { Check, Clock, Minus, Plus, Users } from "./Icons";
import { saveLastBooking } from "./useLastBooking";
import { plural } from "./CartBar";
import {
  MAX_GUESTS,
  MIN_GUESTS,
  ZONES,
  availableDates,
  formatDateKey,
  type SlotState,
  type TableAvailability,
  type ZoneId,
} from "@/lib/booking";
import { RESTAURANT } from "@/lib/restaurant";
import { featuredItems, type MenuItem } from "@/lib/menu";

type Confirmed = {
  code: string;
  dateKey: string;
  slot: string;
  guests: number;
  tableId: number;
  zone: ZoneId;
  serveFrom: string;
};

const DATES = availableDates(21);

export function BookingWizard() {
  const [dateKey, setDateKey] = useState(DATES[0].key);
  const [guests, setGuests] = useState(2);
  const [slot, setSlot] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState<ZoneId | "all">("all");
  const [tableId, setTableId] = useState<number | null>(null);

  const [slots, setSlots] = useState<SlotState[]>([]);
  const [tables, setTables] = useState<TableAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  // Слоты зависят от даты и числа гостей: на восьмерых свободного времени меньше.
  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    fetch(`/api/booking?date=${dateKey}&guests=${guests}`)
      .then((response) => response.json())
      .then((data: { slots?: SlotState[] }) => {
        if (cancelled) return;
        setSlots(data.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey, guests]);

  // Смена даты или числа гостей обнуляет выбор ниже — иначе можно уйти с чужим столом.
  useEffect(() => {
    setSlot(null);
    setTableId(null);
  }, [dateKey, guests]);

  useEffect(() => {
    if (!slot) {
      setTables([]);
      return;
    }
    let cancelled = false;
    setTableId(null);
    fetch(`/api/booking?date=${dateKey}&guests=${guests}&slot=${slot}`)
      .then((response) => response.json())
      .then((data: { tables?: TableAvailability[] }) => {
        if (!cancelled) setTables(data.tables ?? []);
      })
      .catch(() => {
        if (!cancelled) setTables([]);
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey, guests, slot]);

  const selectedTable = tables.find((table) => table.tableId === tableId) ?? null;
  const freeInZone = useMemo(
    () =>
      tables.filter(
        (table) => table.free && !table.tooSmall && (zoneFilter === "all" || table.zone === zoneFilter),
      ).length,
    [tables, zoneFilter],
  );

  const ready = Boolean(slot && tableId && name.trim().length >= 2 && phone.trim().length >= 10);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || sending) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dateKey, slot, guests, tableId, name, phone, comment }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Не удалось забронировать. Попробуйте ещё раз.");
        // Стол мог уйти, пока гость заполнял контакты — обновляем схему.
        if (slot) {
          const refreshed = await fetch(`/api/booking?date=${dateKey}&guests=${guests}&slot=${slot}`);
          const payload = await refreshed.json();
          setTables(payload.tables ?? []);
          setTableId(null);
        }
        return;
      }

      const booking: Confirmed = data;
      setConfirmed(booking);
      saveLastBooking({
        code: booking.code,
        dateKey: booking.dateKey,
        slot: booking.slot,
        guests: booking.guests,
        tableId: booking.tableId,
        zone: booking.zone,
      });
    } catch {
      setError(`Сеть подвела. Позвоните нам: ${RESTAURANT.phone}`);
    } finally {
      setSending(false);
    }
  }

  if (confirmed) {
    return <BookingSuccess booking={confirmed} />;
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="grid min-w-0 gap-4">
        {/* Шаг 1 — дата */}
        <Step index={1} title="Дата" done={Boolean(dateKey)}>
          <div className="rail -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {DATES.map((date) => {
              const active = date.key === dateKey;
              return (
                <button
                  key={date.key}
                  type="button"
                  onClick={() => setDateKey(date.key)}
                  aria-pressed={active}
                  className={`flex w-[68px] shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-xl border py-3 transition-colors ${
                    active
                      ? "border-shu bg-shu text-ink"
                      : "border-line text-text-dim hover:border-line-strong hover:text-text"
                  }`}
                >
                  <span className="label text-[0.5625rem] opacity-80">
                    {date.isToday ? "сегодня" : date.weekday}
                  </span>
                  <span className="tnum text-xl font-bold">{date.day}</span>
                  <span className="label text-[0.5rem] opacity-70">{date.month}</span>
                </button>
              );
            })}
          </div>
        </Step>

        {/* Шаг 2 — гости. Стоит выше времени: от числа гостей зависит, что свободно. */}
        <Step index={2} title="Гости" done>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-ink-3 p-1.5">
              <button
                type="button"
                onClick={() => setGuests((value) => Math.max(MIN_GUESTS, value - 1))}
                aria-label="Меньше гостей"
                className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg text-text-dim transition-colors hover:bg-white/8 hover:text-text"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="tnum w-10 text-center text-xl font-bold" aria-live="polite">
                {guests}
              </span>
              <button
                type="button"
                onClick={() => setGuests((value) => Math.min(MAX_GUESTS, value + 1))}
                aria-label="Больше гостей"
                className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg text-text-dim transition-colors hover:bg-white/8 hover:text-text"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="flex items-center gap-2 text-sm text-text-dim">
              <Users className="h-4 w-4 text-text-faint" />
              {guests === MAX_GUESTS
                ? `Больше ${MAX_GUESTS} гостей — позвоните: ${RESTAURANT.phone}`
                : `${guests} ${plural(guests, "гость", "гостя", "гостей")}`}
            </p>
          </div>
        </Step>

        {/* Шаг 3 — время */}
        <Step index={3} title="Время" done={Boolean(slot)}>
          {loadingSlots ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="h-11 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-text-dim">
              На эту дату запись закрыта. Выберите другой день или позвоните: {RESTAURANT.phone}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((state) => {
                  const active = state.slot === slot;
                  return (
                    <button
                      key={state.slot}
                      type="button"
                      disabled={!state.available}
                      onClick={() => setSlot(state.slot)}
                      aria-pressed={active}
                      className={`tnum h-11 cursor-pointer rounded-lg border text-sm font-semibold transition-colors ${
                        active
                          ? "border-shu bg-shu text-ink"
                          : state.available
                            ? "border-line text-text hover:border-line-strong hover:bg-white/5"
                            : "cursor-not-allowed border-transparent bg-white/[0.03] text-text-faint line-through"
                      }`}
                    >
                      {state.slot}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-text-faint">
                Зачёркнутое время занято. Стол держим {2} часа с момента брони.
              </p>
            </>
          )}
        </Step>

        {/* Шаг 4 — зона и схема зала */}
        <Step index={4} title="Зал и столик" done={Boolean(tableId)} locked={!slot}>
          {!slot ? (
            <p className="text-sm text-text-faint">Сначала выберите время — схема покажет, что свободно.</p>
          ) : (
            <>
              <div className="rail -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
                <ZoneChip
                  active={zoneFilter === "all"}
                  onClick={() => setZoneFilter("all")}
                  title="Весь зал"
                />
                {ZONES.map((zone) => (
                  <ZoneChip
                    key={zone.id}
                    active={zoneFilter === zone.id}
                    onClick={() => setZoneFilter(zone.id)}
                    title={zone.title}
                  />
                ))}
              </div>

              <FloorPlan
                tables={tables}
                selected={tableId}
                onSelect={setTableId}
                guests={guests}
                zoneFilter={zoneFilter}
              />

              <p className="mt-4 text-sm text-text-dim">
                {freeInZone > 0
                  ? `Свободно ${freeInZone} ${plural(freeInZone, "стол", "стола", "столов")} на ${guests} ${plural(guests, "гостя", "гостей", "гостей")}.`
                  : "В этой зоне на выбранное время свободных столов нет — попробуйте другую зону или время."}
              </p>
              {zoneFilter !== "all" ? (
                <p className="mt-1 text-sm text-text-faint">
                  {ZONES.find((zone) => zone.id === zoneFilter)?.description}
                  {ZONES.find((zone) => zone.id === zoneFilter)?.surcharge
                    ? " Депозит списывается в счёт заказа."
                    : ""}
                </p>
              ) : null}
            </>
          )}
        </Step>

        {/* Шаг 5 — контакты */}
        <Step index={5} title="Контакты" done={ready} locked={!tableId}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Имя" htmlFor="booking-name">
              <input
                id="booking-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                minLength={2}
                placeholder="Как к вам обращаться"
                className="h-12 w-full rounded-xl border border-line bg-ink-3 px-4 text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
              />
            </Field>
            <Field label="Телефон" htmlFor="booking-phone" hint="Позвоним, только если что-то поменяется">
              <input
                id="booking-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                autoComplete="tel"
                required
                placeholder="+7 (___) ___-__-__"
                className="h-12 w-full rounded-xl border border-line bg-ink-3 px-4 text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Комментарий" htmlFor="booking-comment" optional>
                <textarea
                  id="booking-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="День рождения, нужен детский стул, аллергия на орехи…"
                  className="w-full resize-y rounded-xl border border-line bg-ink-3 px-4 py-3 text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
                />
              </Field>
            </div>
          </div>
        </Step>
      </div>

      {/* Сводка — липкая на десктопе, чтобы гость всегда видел, что бронирует. */}
      <aside className="lg:sticky lg:top-24">
        <div className="rounded-2xl border border-line bg-ink-2 p-6">
          <p className="label text-text-faint">Ваша бронь</p>
          <dl className="mt-5 space-y-3.5 text-sm">
            <SummaryRow term="Дата" value={formatDateKey(dateKey)} />
            <SummaryRow term="Время" value={slot ?? "не выбрано"} muted={!slot} />
            <SummaryRow term="Гостей" value={String(guests)} />
            <SummaryRow
              term="Столик"
              value={
                selectedTable
                  ? `№${selectedTable.tableId} · ${ZONES.find((zone) => zone.id === selectedTable.zone)?.title}`
                  : "не выбран"
              }
              muted={!selectedTable}
            />
          </dl>

          {error ? (
            <p role="alert" className="mt-5 rounded-xl border border-shu/40 bg-shu/10 p-3 text-sm text-shu-soft">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!ready || sending}
            className="mt-6 h-13 w-full cursor-pointer rounded-xl bg-shu py-4 font-semibold text-ink transition-colors hover:bg-shu-soft disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-text-faint"
          >
            {sending ? "Бронируем…" : "Забронировать"}
          </button>

          <p className="mt-3 text-center text-xs text-text-faint">
            Бесплатно и без предоплаты. Держим стол 20 минут после времени брони.
          </p>
        </div>
      </aside>
    </form>
  );
}

function BookingSuccess({ booking }: { booking: Confirmed }) {
  const zone = ZONES.find((row) => row.id === booking.zone);
  const suggestions: MenuItem[] = featuredItems().slice(0, 3);

  return (
    <div className="grid gap-8">
      <div className="pop overflow-hidden rounded-3xl border border-jade/30 bg-gradient-to-br from-jade/12 to-transparent p-8 sm:p-10">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-jade text-ink">
          <Check className="h-7 w-7" />
        </span>
        <h2 className="display mt-6 text-[clamp(2rem,4vw,2.75rem)]">Стол забронирован</h2>
        <p className="mt-3 text-text-dim">
          Код брони <span className="tnum font-mono font-semibold text-text">{booking.code}</span> —
          назовите его на входе. СМС с подтверждением придёт на указанный телефон.
        </p>

        <dl className="mt-8 grid gap-5 border-t border-line pt-6 sm:grid-cols-4">
          <Fact term="Дата" value={formatDateKey(booking.dateKey)} />
          <Fact term="Время" value={booking.slot} />
          <Fact term="Гостей" value={String(booking.guests)} />
          <Fact term="Столик" value={`№${booking.tableId} · ${zone?.title ?? ""}`} />
        </dl>
      </div>

      {/* Предзаказ — та часть, ради которой всё и затевалось. */}
      <div className="rounded-3xl border border-line bg-ink-2 p-8 sm:p-10">
        <p className="label text-shu">Шаг не обязательный</p>
        <h3 className="display mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)]">
          Хотите заказать блюда заранее?
        </h3>
        <p className="mt-4 max-w-2xl text-text-dim">
          Выберите сет, роллы или напитки — кухня начнёт готовить к вашему приходу. Вы садитесь
          в {booking.slot}, блюда на столе к {booking.serveFrom}. Ждать ничего не придётся.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {suggestions.map((item) => (
            <DishCard key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/menu"
            className="flex items-center gap-2 rounded-full bg-shu px-7 py-3.5 font-semibold text-ink transition-colors hover:bg-shu-soft"
          >
            <Plus className="h-4.5 w-4.5" />
            Добавить блюда
          </Link>
          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-full border border-line px-7 py-3.5 font-semibold text-text transition-colors hover:border-line-strong"
          >
            <Clock className="h-4.5 w-4.5" />
            Перейти к оформлению
          </Link>
          <Link
            href="/"
            className="rounded-full px-7 py-3.5 font-semibold text-text-dim transition-colors hover:text-text"
          >
            Пропустить
          </Link>
        </div>
      </div>
    </div>
  );
}

function Step({
  index,
  title,
  children,
  done,
  locked = false,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
  done?: boolean;
  locked?: boolean;
}) {
  return (
    <section
      // min-w-0 обязателен: без него горизонтальная лента внутри распирает grid-трек
      className={`min-w-0 rounded-2xl border p-5 transition-colors sm:p-6 ${
        locked ? "border-line/60 bg-ink-2/40" : "border-line bg-ink-2"
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
            done ? "bg-jade text-ink" : locked ? "bg-white/6 text-text-faint" : "bg-shu text-ink"
          }`}
        >
          {done ? <Check className="h-4 w-4" /> : index}
        </span>
        <h2 className="text-lg font-semibold text-text">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ZoneChip({
  active,
  onClick,
  title,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
        active
          ? "border-shu bg-shu font-semibold text-ink"
          : "border-line text-text-dim hover:border-line-strong hover:text-text"
      }`}
    >
      {title}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-text">
        {label}
        {optional ? <span className="ml-2 text-xs text-text-faint">необязательно</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-text-faint">{hint}</p> : null}
    </div>
  );
}

function SummaryRow({ term, value, muted }: { term: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3 last:border-0">
      <dt className="text-text-faint">{term}</dt>
      <dd className={`text-right font-semibold ${muted ? "text-text-faint" : "text-text"}`}>{value}</dd>
    </div>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="label text-text-faint">{term}</dt>
      <dd className="mt-2 text-lg font-semibold text-text">{value}</dd>
    </div>
  );
}
