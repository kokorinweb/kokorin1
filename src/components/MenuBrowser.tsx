"use client";

import { useMemo, useState } from "react";
import { DishCard } from "./DishCard";
import { Close } from "./Icons";
import { CATEGORIES, MENU, TAGS, type CategoryId, type Tag } from "@/lib/menu";
import { plural } from "./CartBar";

/**
 * Витрина меню: категории сверху, фильтры под ними.
 * Фильтры складываются по И (острые + с лососем = острые роллы с лососем),
 * потому что «или» на четырёх включённых чипсах превращает выдачу в всё меню.
 */
export function MenuBrowser({ initialCategory }: { initialCategory?: CategoryId }) {
  const [category, setCategory] = useState<CategoryId | "all">(initialCategory ?? "all");
  const [tags, setTags] = useState<Tag[]>([]);

  const items = useMemo(
    () =>
      MENU.filter((item) => category === "all" || item.category === category).filter((item) =>
        tags.every((tag) => item.tags.includes(tag)),
      ),
    [category, tags],
  );

  const toggleTag = (tag: Tag) =>
    setTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    );

  return (
    <div>
      {/* Категории липнут под шапкой: длинное меню без них превращается в бесконечный скролл. */}
      <div className="sticky top-[68px] z-30 -mx-5 border-b border-line bg-ink/92 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
        {/* Затухание справа — подсказка, что лента прокручивается дальше */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent" />
        <div className="rail flex gap-2 overflow-x-auto pb-1">
          <CategoryChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            title="Всё меню"
          />
          {CATEGORIES.map((meta) => (
            <CategoryChip
              key={meta.id}
              active={category === meta.id}
              onClick={() => setCategory(meta.id)}
              title={meta.title}
              jp={meta.jp}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="label mr-1 text-text-faint">Фильтры</span>
        {TAGS.map((tag) => {
          const active = tags.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              aria-pressed={active}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
                active
                  ? "border-shu bg-shu text-ink font-semibold"
                  : "border-line text-text-dim hover:border-line-strong hover:text-text"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
        {tags.length > 0 ? (
          <button
            type="button"
            onClick={() => setTags([])}
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-sm text-text-faint transition-colors hover:text-text"
          >
            <Close className="h-3.5 w-3.5" />
            Сбросить
          </button>
        ) : null}
      </div>

      <p className="mt-5 text-sm text-text-faint" aria-live="polite">
        {items.length} {plural(items.length, "блюдо", "блюда", "блюд")}
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-ink-2 px-6 py-16 text-center">
          <p className="display text-2xl text-text">Под такие фильтры ничего нет</p>
          <p className="mx-auto mt-3 max-w-md text-text-dim">
            Скорее всего, вы выбрали взаимоисключающие признаки — например «без мяса» и «с тунцом».
            Снимите один фильтр.
          </p>
          <button
            type="button"
            onClick={() => setTags([])}
            className="mt-6 cursor-pointer rounded-full bg-shu px-6 py-3 font-semibold text-ink transition-colors hover:bg-shu-soft"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <DishCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  title,
  jp,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  jp?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 cursor-pointer items-baseline gap-2 rounded-full px-4 py-2.5 text-[0.9375rem] transition-colors ${
        active
          ? "bg-white/10 font-semibold text-text"
          : "text-text-dim hover:bg-white/5 hover:text-text"
      }`}
    >
      {title}
      {jp ? <span className="jp text-[0.6875rem] text-text-faint">{jp}</span> : null}
    </button>
  );
}
