"use client";

import { useRef, useState } from "react";
import { CATEGORIES } from "@/lib/catalog";
import { briefToMessage, briefToWhatsappUrl, type Brief } from "@/lib/brief";
import { WhatsappIcon } from "./Icons";

type Errors = Partial<Record<"name" | "phone" | "category", string>>;

const FIELD_CLASS =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-ink transition-colors duration-200 placeholder:text-ink-soft/60 hover:border-walnut/40";

/** Обычная форма для тех, кто не хочет переписываться с помощником. */
export function BriefForm() {
  const [brief, setBrief] = useState<Brief>({});
  const [errors, setErrors] = useState<Errors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  const set = (field: keyof Brief) => (value: string) => {
    setBrief((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found: Errors = {};
    if (!brief.name?.trim()) found.name = "Как к вам обращаться?";
    if (!brief.phone?.trim()) found.phone = "Без телефона менеджер не сможет ответить.";
    if (!brief.category?.trim()) found.category = "Выберите направление.";

    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Фокус на первое поле с ошибкой — чтобы не искать её глазами.
      (found.name ? nameRef : found.phone ? phoneRef : categoryRef).current?.focus();
      return;
    }

    const url = briefToWhatsappUrl(brief);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(url);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="brief-name" className="mb-2 block text-sm font-semibold">
            Имя
          </label>
          <input
            id="brief-name"
            ref={nameRef}
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Анна…"
            value={brief.name ?? ""}
            onChange={(event) => set("name")(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "brief-name-error" : undefined}
            className={FIELD_CLASS}
          />
          {errors.name && (
            <p id="brief-name-error" className="mt-2 text-sm text-walnut-deep">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="brief-phone" className="mb-2 block text-sm font-semibold">
            Телефон
          </label>
          <input
            id="brief-phone"
            ref={phoneRef}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            spellCheck={false}
            placeholder="+7 900 000-00-00…"
            value={brief.phone ?? ""}
            onChange={(event) => set("phone")(event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "brief-phone-error" : undefined}
            className={`${FIELD_CLASS} tabular-nums`}
          />
          {errors.phone && (
            <p id="brief-phone-error" className="mt-2 text-sm text-walnut-deep">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="brief-category" className="mb-2 block text-sm font-semibold">
          Какая мебель нужна?
        </label>
        <select
          id="brief-category"
          ref={categoryRef}
          name="category"
          value={brief.category ?? ""}
          onChange={(event) => set("category")(event.target.value)}
          aria-invalid={Boolean(errors.category)}
          aria-describedby={errors.category ? "brief-category-error" : undefined}
          // Явные цвета: иначе в тёмной теме Windows список рисуется нечитаемым.
          style={{ backgroundColor: "#ffffff", color: "#1b1613" }}
          className={FIELD_CLASS}
        >
          <option value="">Выберите направление…</option>
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.title}>
              {category.title}
            </option>
          ))}
          <option value="Пока не определились">Пока не определились</option>
        </select>
        {errors.category && (
          <p id="brief-category-error" className="mt-2 text-sm text-walnut-deep">
            {errors.category}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="brief-notes" className="mb-2 block text-sm font-semibold">
          Комментарий или размеры
        </label>
        <textarea
          id="brief-notes"
          name="notes"
          rows={4}
          autoComplete="off"
          placeholder="Например: кухня 3,2 м прямая, потолок 2,7, техника уже куплена…"
          value={brief.sizes ?? ""}
          onChange={(event) => set("sizes")(event.target.value)}
          className={`${FIELD_CLASS} resize-y`}
        />
      </div>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-walnut px-7 py-4 text-base font-semibold text-sand transition-colors duration-200 hover:bg-walnut-deep sm:w-auto"
        style={{ touchAction: "manipulation" }}
      >
        <WhatsappIcon className="h-5 w-5" />
        Обсудить заказ
      </button>

      <p className="text-sm leading-relaxed text-ink-soft">
        Кнопка откроет WhatsApp с уже готовым сообщением — останется только отправить:
      </p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-line bg-sand px-4 py-3 text-sm leading-relaxed text-ink-soft">
        {briefToMessage(brief)}
      </pre>
    </form>
  );
}
