"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./CartContext";
import { DishMedia } from "./DishArt";
import { QuantityStepper } from "./DishCard";
import { useLastBooking } from "./useLastBooking";
import { plural } from "./CartBar";
import { ArrowRight, Cart, Check, Clock, Close } from "./Icons";
import { formatPrice, portionLabel } from "@/lib/menu";
import { RESTAURANT } from "@/lib/restaurant";

type Fulfillment = "pickup" | "table";

type BookingInfo = {
  code: string;
  dateLabel: string;
  slot: string;
  guests: number;
  tableId: number;
  zone: string;
  serveTimes: string[];
};

type Done = {
  orderNumber: string;
  total: number;
  fulfillment: Fulfillment;
  when: string;
};

export function CartView({ pickupOptions }: { pickupOptions: string[] }) {
  const { entries, subtotal, count, hydrated, setQuantity, remove, clear } = useCart();
  const { booking: stored, hydrated: bookingHydrated } = useLastBooking();

  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [pickupTime, setPickupTime] = useState(pickupOptions[0] ?? "");
  const [code, setCode] = useState("");
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [serveTime, setServeTime] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  // Есть сохранённая бронь — сразу предлагаем подачу к столику, это и есть сценарий из ТЗ.
  useEffect(() => {
    if (bookingHydrated && stored) {
      setCode(stored.code);
      setFulfillment("table");
    }
  }, [bookingHydrated, stored]);

  // Подтягиваем детали брони по коду: время посадки и допустимые времена подачи.
  useEffect(() => {
    const trimmed = code.trim().toUpperCase();
    if (fulfillment !== "table" || trimmed.length < 6) {
      setBookingInfo(null);
      return;
    }

    let cancelled = false;
    setChecking(true);
    setBookingError(null);

    const timer = setTimeout(() => {
      fetch(`/api/booking/lookup?code=${encodeURIComponent(trimmed)}`)
        .then(async (response) => ({ ok: response.ok, data: await response.json() }))
        .then(({ ok, data }) => {
          if (cancelled) return;
          if (!ok) {
            setBookingInfo(null);
            setBookingError(data.error ?? "Бронь не найдена");
            return;
          }
          setBookingInfo(data);
          setServeTime(data.serveTimes?.[0] ?? "");
        })
        .catch(() => {
          if (!cancelled) setBookingError("Не удалось проверить бронь");
        })
        .finally(() => {
          if (!cancelled) setChecking(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, fulfillment]);

  const discount =
    fulfillment === "pickup"
      ? Math.round((subtotal * RESTAURANT.pickup.discountPercent) / 100)
      : 0;
  const total = subtotal - discount;

  const contactsReady = name.trim().length >= 2 && phone.trim().length >= 10;
  const ready =
    count > 0 &&
    contactsReady &&
    (fulfillment === "pickup" ? Boolean(pickupTime) : Boolean(bookingInfo && serveTime));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || sending) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: entries.map((entry) => ({ itemId: entry.item.id, quantity: entry.quantity })),
          fulfillment,
          name,
          phone,
          comment,
          ...(fulfillment === "pickup"
            ? { pickupTime }
            : { bookingCode: bookingInfo?.code, serveTime }),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Не удалось оформить заказ");
        return;
      }
      setDone({
        orderNumber: data.orderNumber,
        total: data.total,
        fulfillment,
        when: fulfillment === "pickup" ? pickupTime : serveTime,
      });
      clear();
    } catch {
      setError(`Сеть подвела. Позвоните нам: ${RESTAURANT.phone}`);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="pop mx-auto max-w-2xl rounded-3xl border border-jade/30 bg-gradient-to-br from-jade/12 to-transparent p-8 text-center sm:p-12">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-jade text-ink">
          <Check className="h-7 w-7" />
        </span>
        <h2 className="display mt-6 text-3xl">Заказ принят</h2>
        <p className="mt-3 text-text-dim">
          Номер <span className="font-mono font-semibold text-text">{done.orderNumber}</span> на
          сумму {formatPrice(done.total)}.{" "}
          {done.fulfillment === "pickup"
            ? `Заберите в ${done.when} по адресу ${RESTAURANT.address}.`
            : `Подадим к вашему столику в ${done.when}.`}
        </p>
        <p className="mt-3 text-sm text-text-faint">
          Менеджер перезвонит для подтверждения. Оплата на месте.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/menu"
            className="rounded-full bg-shu px-7 py-3.5 font-semibold text-ink transition-colors hover:bg-shu-soft"
          >
            Вернуться в меню
          </Link>
          <Link
            href="/"
            className="rounded-full border border-line px-7 py-3.5 font-semibold text-text transition-colors hover:border-line-strong"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="grid gap-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-white/4" />
        ))}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-ink-2 px-6 py-20 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/6 text-text-faint">
          <Cart className="h-7 w-7" />
        </span>
        <h2 className="display mt-6 text-3xl">В корзине пусто</h2>
        <p className="mx-auto mt-3 max-w-md text-text-dim">
          Загляните в меню — популярные позиции собраны на главной, а фильтры помогут найти острое,
          вегетарианское или с лососем.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/menu"
            className="rounded-full bg-shu px-7 py-3.5 font-semibold text-ink transition-colors hover:bg-shu-soft"
          >
            Открыть меню
          </Link>
          <Link
            href="/booking"
            className="rounded-full border border-line px-7 py-3.5 font-semibold text-text transition-colors hover:border-line-strong"
          >
            Забронировать стол
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="grid min-w-0 gap-6">
        <ul className="grid gap-3">
          {entries.map((entry) => (
            <li
              key={entry.item.id}
              className="flex items-center gap-4 rounded-2xl border border-line bg-ink-2 p-3 sm:p-4"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-ink-3 to-ink">
                <DishMedia item={entry.item} sizes="80px" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{entry.item.name}</p>
                <p className="mt-0.5 text-sm text-text-faint">{portionLabel(entry.item)}</p>
                <p className="tnum mt-1 text-sm text-text-dim">{formatPrice(entry.item.price)}</p>
              </div>

              <QuantityStepper
                value={entry.quantity}
                onChange={(next) => setQuantity(entry.item.id, next)}
                label={entry.item.name}
                size="sm"
              />

              <span className="tnum hidden w-24 shrink-0 text-right font-semibold text-text sm:block">
                {formatPrice(entry.lineTotal)}
              </span>

              <button
                type="button"
                onClick={() => remove(entry.item.id)}
                aria-label={`Убрать из корзины: ${entry.item.name}`}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-text-faint transition-colors hover:bg-white/6 hover:text-text"
              >
                <Close className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        {/* Выбор сценария получения — то самое разветвление из ТЗ. */}
        <fieldset className="rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
          <legend className="label px-2 text-text-faint">Как получить</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Choice
              active={fulfillment === "pickup"}
              onClick={() => setFulfillment("pickup")}
              title="Забрать с собой"
              text={`Готово через ${RESTAURANT.pickup.etaMinutes} минут, скидка ${RESTAURANT.pickup.discountPercent}%`}
            />
            <Choice
              active={fulfillment === "table"}
              onClick={() => setFulfillment("table")}
              title="Заказать к столику"
              text="Подадим к времени вашей брони"
            />
          </div>

          <div className="mt-6">
            {fulfillment === "pickup" ? (
              pickupOptions.length === 0 ? (
                <p className="rounded-xl border border-line bg-ink-3 p-4 text-sm text-text-dim">
                  На сегодня самовывоз уже закрыт. Позвоните нам ({RESTAURANT.phone}) или
                  забронируйте стол на завтра.
                </p>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-text">Когда заберёте</span>
                  <select
                    value={pickupTime}
                    onChange={(event) => setPickupTime(event.target.value)}
                    className="tnum h-12 w-full cursor-pointer rounded-xl border border-line bg-ink-3 px-4 text-text outline-none transition-colors focus:border-shu"
                  >
                    {pickupOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1.5 block text-xs text-text-faint">
                    {RESTAURANT.address} · {RESTAURANT.metro}
                  </span>
                </label>
              )
            ) : (
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-text">Код брони</span>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    placeholder="NORI-8F3K"
                    className="h-12 w-full rounded-xl border border-line bg-ink-3 px-4 font-mono text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
                  />
                  {checking ? (
                    <span className="mt-1.5 block text-xs text-text-faint">Проверяем бронь…</span>
                  ) : bookingError ? (
                    <span className="mt-1.5 block text-xs text-shu-soft">{bookingError}</span>
                  ) : (
                    <span className="mt-1.5 block text-xs text-text-faint">
                      Код пришёл после бронирования. Нет брони —{" "}
                      <Link href="/booking" className="text-shu underline">
                        забронируйте стол
                      </Link>
                      .
                    </span>
                  )}
                </label>

                {bookingInfo ? (
                  <div className="pop rounded-xl border border-jade/30 bg-jade/8 p-4">
                    <p className="text-sm text-text">
                      Стол №{bookingInfo.tableId} · {bookingInfo.zone} ·{" "}
                      {bookingInfo.dateLabel}, {bookingInfo.slot} ·{" "}
                      {bookingInfo.guests} {plural(bookingInfo.guests, "гость", "гостя", "гостей")}
                    </p>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-text">
                        Подать к столу
                      </span>
                      <select
                        value={serveTime}
                        onChange={(event) => setServeTime(event.target.value)}
                        className="tnum h-12 w-full cursor-pointer rounded-xl border border-line bg-ink-3 px-4 text-text outline-none transition-colors focus:border-shu"
                      >
                        {bookingInfo.serveTimes.map((time) => (
                          <option key={time} value={time}>
                            {time}
                            {time === bookingInfo.serveTimes[0] ? " — сразу к приходу" : ""}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1.5 flex items-center gap-1.5 text-xs text-text-faint">
                        <Clock className="h-3.5 w-3.5" />
                        Вы садитесь в {bookingInfo.slot} — блюда будут на столе к {serveTime}
                      </span>
                    </label>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </fieldset>

        <div className="grid gap-4 rounded-2xl border border-line bg-ink-2 p-5 sm:grid-cols-2 sm:p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text">Имя</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              minLength={2}
              placeholder="Как к вам обращаться"
              className="h-12 w-full rounded-xl border border-line bg-ink-3 px-4 text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text">Телефон</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              autoComplete="tel"
              required
              placeholder="+7 (___) ___-__-__"
              className="h-12 w-full rounded-xl border border-line bg-ink-3 px-4 text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-text">
              Комментарий <span className="text-xs text-text-faint">необязательно</span>
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Без васаби, побольше имбиря, аллергия на орехи…"
              className="w-full resize-y rounded-xl border border-line bg-ink-3 px-4 py-3 text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
            />
          </label>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24">
        <div className="rounded-2xl border border-line bg-ink-2 p-6">
          <p className="label text-text-faint">Итого</p>

          <dl className="mt-5 space-y-3 text-sm">
            <Row term={`${count} ${plural(count, "позиция", "позиции", "позиций")}`} value={formatPrice(subtotal)} />
            {discount > 0 ? (
              <Row
                term={`Скидка за самовывоз ${RESTAURANT.pickup.discountPercent}%`}
                value={`−${formatPrice(discount)}`}
                accent
              />
            ) : null}
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="text-text-dim">К оплате</span>
            <span className="tnum display text-3xl text-shu">{formatPrice(total)}</span>
          </div>

          {error ? (
            <p role="alert" className="mt-5 rounded-xl border border-shu/40 bg-shu/10 p-3 text-sm text-shu-soft">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!ready || sending}
            className="mt-6 flex h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-shu py-4 font-semibold text-ink transition-colors hover:bg-shu-soft disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-text-faint"
          >
            {sending ? "Отправляем…" : "Оформить заказ"}
            {!sending ? <ArrowRight className="h-4.5 w-4.5" /> : null}
          </button>

          <p className="mt-3 text-center text-xs text-text-faint">
            Оплата на месте. Онлайн-касса пока не подключена — менеджер подтвердит заказ звонком.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Choice({
  active,
  onClick,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-xl border p-4 text-left transition-colors ${
        active ? "border-shu bg-shu/10" : "border-line hover:border-line-strong"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
            active ? "border-shu bg-shu text-ink" : "border-line-strong"
          }`}
        >
          {active ? <Check className="h-3 w-3" /> : null}
        </span>
        <span className="font-semibold text-text">{title}</span>
      </span>
      <span className="mt-2 block pl-7.5 text-sm text-text-dim">{text}</span>
    </button>
  );
}

function Row({ term, value, accent }: { term: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-dim">{term}</dt>
      <dd className={`tnum font-semibold ${accent ? "text-jade" : "text-text"}`}>{value}</dd>
    </div>
  );
}
