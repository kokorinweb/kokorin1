"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, MENU, formatPrice, type CategoryId } from "@/lib/menu";
import { quoteOrder, type Fulfillment } from "@/lib/order";
import { RESTAURANT } from "@/lib/restaurant";
import { createPhoneOrder, lookupCustomer } from "@/app/admin/actions";
import { Button, Card, CardHead, Field, INPUT_CLASS } from "./ui";
import { money, relative } from "./format";
import { tagMeta } from "@/lib/tags";

/**
 * Заказ, принятый по телефону.
 *
 * Суммы считает тот же `quoteOrder`, что и корзина гостя, — здесь нет ни одного
 * поля, куда менеджер вписывал бы цену руками: второй источник правды по деньгам
 * означал бы, что рано или поздно они разойдутся.
 */
export function PhoneOrderForm({
  unavailable,
  initialPhone = "",
}: {
  unavailable: Record<string, string>;
  initialPhone?: string;
}) {
  const [lines, setLines] = useState<{ itemId: string; quantity: number }[]>([]);
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [search, setSearch] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [known, setKnown] = useState<Awaited<ReturnType<typeof lookupCustomer>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const quote = useMemo(() => quoteOrder(lines, fulfillment), [lines, fulfillment]);
  const belowMinimum =
    fulfillment === "delivery" && quote.subtotal > 0 && quote.subtotal < RESTAURANT.delivery.minOrder;

  // Узнаём гостя по номеру: имя, сколько раз заказывал, метки.
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setKnown(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const found = await lookupCustomer(phone);
      if (cancelled) return;
      setKnown(found.found ? found : null);
      if (found.found && found.name && !name.trim()) setName(found.name);
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // name намеренно не в зависимостях: подставляем имя только если поле пустое.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return MENU.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) || item.nameIt.toLowerCase().includes(query)
      );
    });
  }, [category, search]);

  function add(itemId: string) {
    if (unavailable[itemId] !== undefined) return;
    setLines((current) => {
      const existing = current.find((line) => line.itemId === itemId);
      if (existing) {
        return current.map((line) =>
          line.itemId === itemId ? { ...line, quantity: Math.min(line.quantity + 1, 20) } : line,
        );
      }
      return [...current, { itemId, quantity: 1 }];
    });
  }

  function setQuantity(itemId: string, quantity: number) {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.itemId !== itemId)
        : current.map((line) =>
            line.itemId === itemId ? { ...line, quantity: Math.min(quantity, 20) } : line,
          ),
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || lines.length === 0) return;

    startTransition(async () => {
      const result = await createPhoneOrder({
        lines,
        fulfillment,
        name,
        phone,
        address,
        comment,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setError(null);
      setDone(result.number);
      setLines([]);
      setComment("");
      router.refresh();
    });
  }

  if (done) {
    return (
      <Card className="text-center">
        <p className="text-sm text-ink-muted">Заказ принят</p>
        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{done}</p>
        <p className="mt-2 text-sm text-ink-soft">
          Он уже в списке заказов и в рабочем чате телеграма.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href={`/admin/orders/${done}`}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            Открыть заказ
          </Link>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="rounded-xl bg-tint px-4 py-2.5 text-sm font-semibold transition hover:bg-line"
          >
            Принять ещё один
          </button>
        </div>
      </Card>
    );
  }

  return (
    // grid-cols-[minmax(0,1fr)] на узком экране обязателен: без него колонка
    // растягивается под самый широкий ряд (полосу категорий) и страница уезжает
    // в горизонтальную прокрутку.
    <form
      onSubmit={submit}
      className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
    >
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHead title="Блюда" hint="те же цены, что на сайте" />

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Найти блюдо"
              aria-label="Найти блюдо"
              className={`${INPUT_CLASS} min-w-[180px] flex-1`}
            />
          </div>

          <div className="mt-3 -mx-1 flex w-full min-w-0 gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setCategory("all")}
              aria-pressed={category === "all"}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                category === "all"
                  ? "border-accent/25 bg-accent-tint text-accent-strong"
                  : "border-line bg-white text-ink-muted hover:bg-tint"
              }`}
            >
              Всё меню
            </button>
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                aria-pressed={category === item.id}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  category === item.id
                    ? "border-accent/25 bg-accent-tint text-accent-strong"
                    : "border-line bg-white text-ink-muted hover:bg-tint"
                }`}
              >
                {item.subtitle}
              </button>
            ))}
          </div>

          <ul className="mt-3 max-h-[26rem] divide-y divide-line overflow-y-auto">
            {visible.map((item) => {
              const stopped = unavailable[item.id] !== undefined;
              const inOrder = lines.find((line) => line.itemId === item.id);

              return (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${stopped ? "text-ink-muted" : ""}`}>
                      {item.name}
                      {stopped ? (
                        <span className="ml-2 rounded-full bg-warn-tint px-2 py-0.5 text-[11px] font-bold text-warn">
                          закончилось
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {formatPrice(item.price)} · {item.portion}
                    </p>
                  </div>

                  {inOrder ? (
                    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-line">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, inOrder.quantity - 1)}
                        aria-label={`Убрать одну порцию: ${item.name}`}
                        className="h-8 w-8 rounded-l-xl text-ink-soft transition hover:bg-tint"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">
                        {inOrder.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, inOrder.quantity + 1)}
                        aria-label={`Добавить порцию: ${item.name}`}
                        className="h-8 w-8 rounded-r-xl text-ink-soft transition hover:bg-tint"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => add(item.id)}
                      disabled={stopped}
                      className="shrink-0 rounded-xl bg-tint px-3 py-1.5 text-xs font-bold transition hover:bg-line disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Добавить
                    </button>
                  )}
                </li>
              );
            })}
            {visible.length === 0 ? (
              <li className="py-6 text-center text-sm text-ink-muted">
                Ничего не нашлось. Проверьте название.
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHead title="Заказ" hint={`${quote.lines.length} позиций`} />

          {quote.lines.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              Пусто. Добавьте блюда из меню — суммы посчитаются сами.
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {quote.lines.map((line) => (
                  <li key={line.item.id} className="flex items-baseline gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{line.item.name}</span>
                    <span className="shrink-0 text-xs text-ink-muted tabular-nums">
                      ×{line.quantity}
                    </span>
                    <span className="w-20 shrink-0 text-right font-semibold tabular-nums">
                      {money(line.lineTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.item.id, 0)}
                      aria-label={`Удалить ${line.item.name}`}
                      className="shrink-0 px-1 text-ink-muted transition hover:text-warn"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Позиции</dt>
                  <dd className="tabular-nums">{money(quote.subtotal)}</dd>
                </div>
                {quote.discount > 0 ? (
                  <div className="flex justify-between text-accent-strong">
                    <dt>Скидка за самовывоз {RESTAURANT.pickup.discountPercent}%</dt>
                    <dd className="tabular-nums">−{money(quote.discount)}</dd>
                  </div>
                ) : null}
                {quote.deliveryFee > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">Доставка</dt>
                    <dd className="tabular-nums">{money(quote.deliveryFee)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                  <dt>Итого</dt>
                  <dd className="tabular-nums">{money(quote.total)}</dd>
                </div>
              </dl>
            </>
          )}
        </Card>

        <Card>
          <CardHead title="Гость" />

          <div className="mt-3 space-y-3">
            <Field label="Телефон" hint="по нему заказ попадёт в карточку гостя">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                required
                placeholder="+7 (900) 000-00-00"
                className={INPUT_CLASS}
              />
            </Field>

            {known?.found ? (
              <div className="rounded-xl bg-accent-tint px-3 py-2 text-xs text-accent-strong">
                Уже заказывал: {known.ordersCount}{" "}
                {known.ordersCount === 1 ? "заказ" : "заказов"}
                {known.lastOrderAt ? `, последний ${relative(new Date(known.lastOrderAt))}` : ""}.
                {known.tags && known.tags.length > 0 ? (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {known.tags.map((id) => {
                      const meta = tagMeta(id);
                      return meta ? (
                        <span
                          key={id}
                          className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold"
                        >
                          {meta.label}
                        </span>
                      ) : null;
                    })}
                  </span>
                ) : null}
              </div>
            ) : null}

            <Field label="Имя">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={60}
                className={INPUT_CLASS}
              />
            </Field>

            <div className="flex gap-2">
              {(["delivery", "pickup"] as const).map((way) => (
                <button
                  key={way}
                  type="button"
                  onClick={() => setFulfillment(way)}
                  aria-pressed={fulfillment === way}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    fulfillment === way
                      ? "border-accent/25 bg-accent-tint text-accent-strong"
                      : "border-line bg-white text-ink-soft hover:bg-tint"
                  }`}
                >
                  {way === "delivery" ? "Доставка" : "Самовывоз"}
                </button>
              ))}
            </div>

            {fulfillment === "delivery" ? (
              <Field label="Адрес">
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  required
                  maxLength={200}
                  placeholder="Улица, дом, квартира"
                  className={INPUT_CLASS}
                />
              </Field>
            ) : null}

            <Field label="Комментарий" hint="без лука, позвонить за 10 минут">
              <input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={500}
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          {belowMinimum ? (
            <p className="mt-3 rounded-xl bg-gold-tint px-3 py-2 text-xs text-gold-ink">
              Минимальная сумма доставки — {money(RESTAURANT.delivery.minOrder)}. Добавьте ещё
              или предложите самовывоз со скидкой {RESTAURANT.pickup.discountPercent}%.
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-xl bg-warn-tint px-3 py-2 text-xs text-warn">{error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={pending || lines.length === 0 || belowMinimum}
            className="mt-4 w-full"
          >
            {pending ? "Оформляем…" : "Принять заказ"}
          </Button>
        </Card>
      </div>
    </form>
  );
}
