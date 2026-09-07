"use client";

import { useCart } from "./CartContext";
import { DishMedia } from "./DishArt";
import { Check, Flame, Leaf, Minus, Plus, Sparkle } from "./Icons";
import { formatPrice, portionLabel, type MenuItem, type Tag } from "@/lib/menu";

const TAG_ICON: Partial<Record<Tag, typeof Flame>> = {
  spicy: Flame,
  veggie: Leaf,
  new: Sparkle,
};

const TAG_LABEL: Record<Tag, string> = {
  spicy: "Острое",
  veggie: "Без мяса",
  salmon: "Лосось",
  tuna: "Тунец",
  baked: "Запечённое",
  new: "Новинка",
};

/** Плашки на фото: показываем максимум две, иначе карточка превращается в ёлку. */
function Badges({ item }: { item: MenuItem }) {
  const shown = item.tags.filter((tag) => tag === "new" || tag === "spicy" || tag === "veggie").slice(0, 2);
  if (!shown.length && !item.chef) return null;

  return (
    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
      {item.chef ? (
        <span className="label rounded-full bg-shu px-2.5 py-1.5 text-[0.5625rem] text-ink">
          Блюдо шефа
        </span>
      ) : null}
      {shown.map((tag) => {
        const Icon = TAG_ICON[tag];
        return (
          <span
            key={tag}
            className="label flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1.5 text-[0.5625rem] text-text backdrop-blur-sm"
          >
            {Icon ? <Icon className="h-3 w-3" /> : null}
            {TAG_LABEL[tag]}
          </span>
        );
      })}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const button =
    size === "sm"
      ? "h-8 w-8 rounded-lg"
      : "h-11 w-11 rounded-xl";

  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-ink-3 p-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label={`Убрать одну порцию: ${label}`}
        className={`${button} grid cursor-pointer place-items-center text-text-dim transition-colors hover:bg-white/8 hover:text-text`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="tnum w-8 text-center text-[0.9375rem] font-semibold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`Добавить ещё одну порцию: ${label}`}
        className={`${button} grid cursor-pointer place-items-center text-text-dim transition-colors hover:bg-white/8 hover:text-text`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DishCard({ item, featured = false }: { item: MenuItem; featured?: boolean }) {
  const { lines, add, setQuantity, lastAdded } = useCart();
  const quantity = lines.find((line) => line.itemId === item.id)?.quantity ?? 0;
  const justAdded = lastAdded === item.id && quantity > 0;

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-ink-2 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] ${
        featured ? "sm:rounded-3xl" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-ink-3 to-ink ${
          featured ? "aspect-[4/3]" : "aspect-[5/4]"
        }`}
      >
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.06]">
          <DishMedia item={item} sizes="(max-width: 640px) 100vw, 360px" />
        </div>
        <Badges item={item} />
        <span className="label absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1.5 text-[0.5625rem] text-text-dim backdrop-blur-sm">
          {portionLabel(item)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`display ${featured ? "text-2xl" : "text-xl"} leading-tight text-text`}>
            {item.name}
          </h3>
          <span className="tnum shrink-0 pt-1 text-[1.0625rem] font-bold text-shu">
            {formatPrice(item.price)}
          </span>
        </div>

        <p className="jp mt-1 text-xs text-text-faint">{item.nameJp}</p>

        <p className="mt-3 flex-1 text-[0.875rem] leading-relaxed text-text-dim">
          {item.composition.join(" · ")}
        </p>

        <div className="mt-5">
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => add(item.id)}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/6 font-semibold text-text transition-colors hover:bg-shu hover:text-ink"
            >
              <Plus className="h-4.5 w-4.5" />
              В корзину
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <QuantityStepper
                value={quantity}
                onChange={(next) => setQuantity(item.id, next)}
                label={item.name}
              />
              <span
                className={`flex items-center gap-1.5 text-sm font-semibold ${
                  justAdded ? "text-jade" : "text-text-dim"
                }`}
              >
                <Check className="h-4 w-4" />
                {formatPrice(item.price * quantity)}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
