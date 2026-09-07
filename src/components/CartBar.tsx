"use client";

import Link from "next/link";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/menu";
import { ArrowRight, Cart } from "./Icons";

/**
 * Плавающая полоса корзины. Появляется, как только в корзине что-то есть, —
 * гость не должен искать, куда делось добавленное блюдо.
 */
export function CartBar() {
  const { count, subtotal, hydrated } = useCart();
  if (!hydrated || count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="pop pointer-events-auto mx-auto flex max-w-2xl items-center gap-4 rounded-2xl border border-line-strong bg-ink-3/95 p-3 pl-5 shadow-[0_20px_60px_-16px_rgba(0,0,0,0.95)] backdrop-blur-xl">
        <Cart className="hidden h-5 w-5 shrink-0 text-shu sm:block" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">
            {count} {plural(count, "позиция", "позиции", "позиций")} в корзине
          </p>
          <p className="tnum text-xs text-text-dim">На сумму {formatPrice(subtotal)}</p>
        </div>
        <Link
          href="/cart"
          className="flex shrink-0 items-center gap-2 rounded-xl bg-shu px-5 py-3 font-semibold text-ink transition-colors hover:bg-shu-soft"
        >
          Оформить
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
