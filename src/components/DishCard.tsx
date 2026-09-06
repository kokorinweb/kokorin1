"use client";

import { useState } from "react";
import { formatPrice, type MenuItem } from "@/lib/menu";
import { useCart } from "./CartContext";

export function DishCard({ item }: { item: MenuItem }) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    add(item.id, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-cream-dark bg-white/70 p-5 transition-shadow hover:shadow-lg hover:shadow-ink/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="display text-xl leading-tight">{item.name}</h3>
          <p className="text-sm italic text-ink-soft">{item.nameIt}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="display text-lg text-terracotta">{formatPrice(item.price)}</div>
          <div className="text-xs text-ink-soft">{item.portion}</div>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{item.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
        {item.vegetarian && (
          <span className="rounded-full bg-basil/10 px-2 py-0.5 text-basil">вегетарианское</span>
        )}
        {item.spicy && (
          <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-terracotta">острое</span>
        )}
        {item.allergens.length > 0 && (
          <span className="rounded-full bg-cream-dark px-2 py-0.5 text-ink-soft">
            аллергены: {item.allergens.join(", ")}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className={`mt-5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
          justAdded
            ? "bg-basil text-cream"
            : "bg-cream-dark text-ink hover:bg-basil hover:text-cream"
        }`}
      >
        {justAdded ? "Добавлено ✓" : "В корзину"}
      </button>
    </article>
  );
}
