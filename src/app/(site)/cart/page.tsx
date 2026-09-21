"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/CartContext";
import { formatPrice } from "@/lib/menu";
import { quoteOrder, type Fulfillment } from "@/lib/order";
import { RESTAURANT } from "@/lib/restaurant";

type Submitted = { orderNumber: string; total: number; etaMinutes: number };

export default function CartPage() {
  const { entries, lines, subtotal, hydrated, setQuantity, remove, clear } = useCart();

  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Submitted | null>(null);

  const quote = useMemo(() => quoteOrder(lines, fulfillment), [lines, fulfillment]);

  const belowMinimum =
    fulfillment === "delivery" && subtotal > 0 && subtotal < RESTAURANT.delivery.minOrder;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, fulfillment, name, phone, address, comment }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Не удалось оформить заказ");
      }

      setDone({
        orderNumber: data.orderNumber,
        total: data.total,
        etaMinutes: data.etaMinutes,
      });
      clear();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось оформить заказ");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <div className="text-5xl" aria-hidden>
          🍷
        </div>
        <h1 className="display mt-6 text-4xl">Заказ {done.orderNumber} принят</h1>
        <p className="mt-4 text-ink-soft">
          Сумма к оплате — {formatPrice(done.total)}. Менеджер перезвонит в течение нескольких минут,
          чтобы подтвердить заказ. Ориентировочное время — {done.etaMinutes} минут.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Онлайн-оплата пока не подключена: оплата курьеру или на кассе.
        </p>
        <Link
          href="/menu"
          className="mt-8 inline-block rounded-full bg-basil px-7 py-3.5 font-semibold text-cream hover:bg-basil-dark"
        >
          Вернуться в меню
        </Link>
      </div>
    );
  }

  if (!hydrated) {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-ink-soft sm:px-6">Загружаем корзину…</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="display text-4xl">Корзина пуста</h1>
        <p className="mt-4 text-ink-soft">
          Загляните в меню или спросите Луку — он подберёт блюда под ваш вкус и сам всё добавит.
        </p>
        <Link
          href="/menu"
          className="mt-8 inline-block rounded-full bg-basil px-7 py-3.5 font-semibold text-cream hover:bg-basil-dark"
        >
          Открыть меню
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-14 sm:px-6">
      <h1 className="display text-5xl">Корзина</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.item.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-cream-dark bg-white/70 p-4"
            >
              <div className="min-w-40 flex-1">
                <div className="display text-xl leading-tight">{entry.item.name}</div>
                <div className="text-sm text-ink-soft">
                  {formatPrice(entry.item.price)} · {entry.item.portion}
                </div>
              </div>

              <div className="flex items-center gap-1 rounded-full border border-cream-dark">
                <QtyButton
                  label={`Уменьшить количество: ${entry.item.name}`}
                  onClick={() => setQuantity(entry.item.id, entry.quantity - 1)}
                >
                  −
                </QtyButton>
                <span className="w-8 text-center tabular-nums">{entry.quantity}</span>
                <QtyButton
                  label={`Увеличить количество: ${entry.item.name}`}
                  onClick={() => setQuantity(entry.item.id, entry.quantity + 1)}
                >
                  +
                </QtyButton>
              </div>

              <div className="display w-24 text-right text-lg">{formatPrice(entry.lineTotal)}</div>

              <button
                type="button"
                onClick={() => remove(entry.item.id)}
                aria-label={`Удалить ${entry.item.name}`}
                className="text-ink-soft transition-colors hover:text-terracotta"
              >
                ×
              </button>
            </li>
          ))}

          <li className="pt-2">
            <button
              type="button"
              onClick={clear}
              className="text-sm text-ink-soft underline hover:text-terracotta"
            >
              Очистить корзину
            </button>
          </li>
        </ul>

        <form
          onSubmit={submit}
          className="h-fit rounded-2xl border border-cream-dark bg-white/70 p-6"
        >
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={fulfillment === "delivery"}
              onClick={() => setFulfillment("delivery")}
            >
              🚚 Доставка
            </ModeButton>
            <ModeButton
              active={fulfillment === "pickup"}
              onClick={() => setFulfillment("pickup")}
            >
              🏃 Самовывоз −{RESTAURANT.pickup.discountPercent}%
            </ModeButton>
          </div>

          <div className="mt-5 space-y-3">
            <Field label="Имя" value={name} onChange={setName} required placeholder="Как к вам обращаться" />
            <Field
              label="Телефон"
              value={phone}
              onChange={setPhone}
              required
              type="tel"
              placeholder="+7 999 123-45-67"
            />
            {fulfillment === "delivery" && (
              <Field
                label="Адрес доставки"
                value={address}
                onChange={setAddress}
                required
                placeholder="Улица, дом, квартира"
              />
            )}
            <Field
              label="Комментарий"
              value={comment}
              onChange={setComment}
              placeholder="Например: без лука, позвонить за 10 минут"
            />
          </div>

          <dl className="mt-6 space-y-2 border-t border-cream-dark pt-5 text-sm">
            <Row term="Блюда" value={formatPrice(quote.subtotal)} />
            {quote.discount > 0 && (
              <Row
                term={`Скидка за самовывоз ${RESTAURANT.pickup.discountPercent}%`}
                value={`−${formatPrice(quote.discount)}`}
                accent
              />
            )}
            {fulfillment === "delivery" && (
              <Row
                term="Доставка"
                value={quote.deliveryFee === 0 ? "бесплатно" : formatPrice(quote.deliveryFee)}
              />
            )}
            <div className="flex justify-between border-t border-cream-dark pt-3">
              <dt className="display text-xl">Итого</dt>
              <dd className="display text-xl text-terracotta">{formatPrice(quote.total)}</dd>
            </div>
          </dl>

          {belowMinimum && (
            <p className="mt-4 rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
              Минимальная сумма заказа на доставку — {formatPrice(RESTAURANT.delivery.minOrder)}.
              Добавьте ещё на {formatPrice(RESTAURANT.delivery.minOrder - subtotal)} или выберите
              самовывоз.
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || belowMinimum}
            className="mt-5 w-full rounded-full bg-basil px-6 py-3.5 font-semibold text-cream transition-colors hover:bg-basil-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Отправляем…" : "Оформить заказ"}
          </button>

          <p className="mt-3 text-center text-xs text-ink-soft">
            Оплата курьеру или на кассе. Менеджер перезвонит для подтверждения.
          </p>
        </form>
      </div>
    </div>
  );
}

function Row({ term, value, accent }: { term: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-soft">{term}</dt>
      <dd className={accent ? "text-basil" : ""}>{value}</dd>
    </div>
  );
}

function QtyButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-9 w-9 rounded-full text-lg text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink"
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
        active ? "bg-basil text-cream" : "bg-cream-dark text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-ink-soft">
        {label}
        {required && <span className="text-terracotta"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-cream-dark bg-cream px-4 py-2.5 outline-none focus:border-basil"
      />
    </label>
  );
}
