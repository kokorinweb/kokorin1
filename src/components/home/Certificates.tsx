"use client";

import { useState } from "react";
import { Kicker, Section } from "../Section";
import { Reveal } from "../ui";
import { Check, Gift } from "../Icons";
import { CERTIFICATE_AMOUNTS } from "@/lib/content";
import { formatPrice } from "@/lib/menu";
import { RESTAURANT } from "@/lib/restaurant";

/**
 * Подарочный сертификат.
 * Онлайн-оплаты в проекте нет, поэтому форма честно оформляет заявку:
 * менеджер перезванивает и присылает ссылку на оплату. Врать кнопкой «Купить» не будем.
 */
export function Certificates() {
  const [amount, setAmount] = useState<number>(CERTIFICATE_AMOUNTS[1]);
  const [custom, setCustom] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const isCustom = amount === 0;
  const finalAmount = isCustom ? Number(custom.replace(/\D/g, "")) : amount;
  const valid = finalAmount >= 1000 && name.trim().length >= 2 && phone.trim().length >= 10;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || status === "sending") return;

    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/certificate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: finalAmount, name, phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Не получилось отправить заявку");
        setStatus("idle");
        return;
      }
      setStatus("done");
    } catch {
      setError(`Сеть подвела. Позвоните нам: ${RESTAURANT.phone}`);
      setStatus("idle");
    }
  }

  return (
    <Section id="certificates">
      <div className="grid gap-10 rounded-3xl border border-line bg-gradient-to-br from-ink-2 to-ink p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Kicker>Сертификаты</Kicker>
          <h2 className="display mt-5 text-[clamp(2rem,4.5vw,3.25rem)]">
            Подарите вечер <span className="italic text-shu">в НОРИ</span>
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-text-dim">
            Сертификат действует год, тратится частями и не сгорает после первого визита. Можно
            отправить получателю в Telegram или забрать бумажный конверт у хостес.
          </p>
          <ul className="mt-7 space-y-2.5 text-[0.9375rem] text-text-dim">
            {["Действует 12 месяцев", "Можно потратить за несколько визитов", "Работает и на бронь, и на самовывоз"].map(
              (row) => (
                <li key={row} className="flex items-center gap-3">
                  <Check className="h-4.5 w-4.5 shrink-0 text-jade" />
                  {row}
                </li>
              ),
            )}
          </ul>
        </div>

        <Reveal delay={80}>
          {status === "done" ? (
            <div className="pop rounded-2xl border border-jade/40 bg-jade/10 p-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-jade text-ink">
                <Check className="h-7 w-7" />
              </span>
              <h3 className="display mt-5 text-2xl">Заявка принята</h3>
              <p className="mt-3 text-text-dim">
                Менеджер перезвонит в течение часа в рабочее время и пришлёт ссылку на оплату
                сертификата на {formatPrice(finalAmount)}.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl border border-line bg-ink-2 p-7">
              <p className="label text-text-faint">Номинал</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CERTIFICATE_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    aria-pressed={amount === value}
                    className={`tnum cursor-pointer rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                      amount === value
                        ? "border-shu bg-shu text-ink"
                        : "border-line text-text hover:border-line-strong"
                    }`}
                  >
                    {value.toLocaleString("ru-RU")}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount(0)}
                  aria-pressed={isCustom}
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                    isCustom ? "border-shu bg-shu text-ink" : "border-line text-text hover:border-line-strong"
                  }`}
                >
                  Своя
                </button>
              </div>

              {isCustom ? (
                <input
                  value={custom}
                  onChange={(event) => setCustom(event.target.value)}
                  inputMode="numeric"
                  placeholder="Сумма от 1 000 ₽"
                  aria-label="Своя сумма сертификата"
                  className="mt-3 h-12 w-full rounded-xl border border-line bg-ink-3 px-4 text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
                />
              ) : null}

              <div className="mt-5 grid gap-3">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ваше имя"
                  aria-label="Ваше имя"
                  autoComplete="name"
                  className="h-12 w-full rounded-xl border border-line bg-ink-3 px-4 text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
                />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  autoComplete="tel"
                  placeholder="Телефон для связи"
                  aria-label="Телефон для связи"
                  className="h-12 w-full rounded-xl border border-line bg-ink-3 px-4 text-text outline-none transition-colors placeholder:text-text-faint focus:border-shu"
                />
              </div>

              {error ? (
                <p role="alert" className="mt-4 text-sm text-shu-soft">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!valid || status === "sending"}
                className="mt-5 flex h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-shu py-4 font-semibold text-ink transition-colors hover:bg-shu-soft disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-text-faint"
              >
                <Gift className="h-5 w-5" />
                {status === "sending" ? "Отправляем…" : "Оформить сертификат"}
              </button>
              <p className="mt-3 text-center text-xs text-text-faint">
                Оплата по ссылке от менеджера. Онлайн-касса на сайте пока не подключена.
              </p>
            </form>
          )}
        </Reveal>
      </div>
    </Section>
  );
}
