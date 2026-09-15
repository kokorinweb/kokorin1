"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, MENU, type CategoryId } from "@/lib/menu";
import { DishCard } from "./DishCard";

type Filter = CategoryId | "all";

const DIET_FILTERS = [
  { id: "any", label: "Любые" },
  { id: "veg", label: "Вегетарианские" },
  { id: "no-gluten", label: "Без глютена" },
] as const;

type Diet = (typeof DIET_FILTERS)[number]["id"];

export function MenuBrowser() {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<Filter>("all");
  const [diet, setDiet] = useState<Diet>("any");

  // ИИ-помощник умеет открывать раздел: он ведёт на /menu?cat=pizza.
  const requested = searchParams.get("cat");
  useEffect(() => {
    if (requested && CATEGORIES.some((c) => c.id === requested)) {
      setCategory(requested as CategoryId);
      document.getElementById("menu-list")?.scrollIntoView({ block: "start" });
    }
  }, [requested]);

  // Заголовок раздела: и подпись к выборке, и недостающая ступень в иерархии заголовков.
  const heading = useMemo(() => {
    const found = CATEGORIES.find((c) => c.id === category);
    return found ?? { title: "Всё меню", subtitle: "все разделы" };
  }, [category]);

  const visible = useMemo(() => {
    return MENU.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (diet === "veg" && !item.vegetarian) return false;
      if (diet === "no-gluten" && item.allergens.includes("глютен")) return false;
      return true;
    });
  }, [category, diet]);

  return (
    <div id="menu-list">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
          Всё меню
        </FilterChip>
        {CATEGORIES.map((item) => (
          <FilterChip
            key={item.id}
            active={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.title}
          </FilterChip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-soft">Ограничения:</span>
        {DIET_FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setDiet(option.id)}
            className={`rounded-full px-4 py-3 transition-colors ${
              diet === option.id
                ? "bg-terracotta text-on-terracotta"
                : "bg-shell text-ink-soft hover:bg-plaster-dark"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-plaster-dark pt-5">
        <h2 className="display text-2xl">{heading.title}</h2>
        <p className="text-sm text-ink-soft">
          {heading.subtitle} · найдено блюд: {visible.length}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-plaster-dark p-10 text-center text-ink-soft">
          Под эти условия ничего не подошло. Снимите один из фильтров или спросите нашего
          ИИ-помощника: он подберёт замену.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <DishCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
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
      className={`rounded-full border px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-basil bg-basil text-on-basil"
          : "border-plaster-dark bg-shell text-ink hover:border-basil hover:text-basil"
      }`}
    >
      {children}
    </button>
  );
}
