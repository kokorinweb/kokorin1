"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { RESTAURANT } from "@/lib/restaurant";

const NAV = [
  { href: "/", label: "Главная" },
  { href: "/menu", label: "Меню" },
  { href: "/#contacts", label: "Контакты" },
];

export function Header() {
  const { count, hydrated } = useCart();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-cream-dark/80 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="display text-2xl text-basil">Osteria</span>
          <span className="display text-2xl text-terracotta">Bellini</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm sm:flex">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "text-basil font-semibold"
                  : "text-ink-soft transition-colors hover:text-basil"
              }
            >
              {link.label}
            </Link>
          ))}
          <a
            href={`tel:${RESTAURANT.phoneHref}`}
            className="text-ink-soft transition-colors hover:text-basil"
          >
            {RESTAURANT.phone}
          </a>
        </nav>

        <Link
          href="/cart"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-basil px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-basil-dark sm:ml-0"
          aria-label={`Корзина, ${count} позиций`}
        >
          <span aria-hidden>🛒</span>
          <span className="hidden sm:inline">Корзина</span>
          {hydrated && count > 0 && (
            <span className="inline-flex min-w-6 justify-center rounded-full bg-cream px-1.5 text-xs font-bold text-basil">
              {count}
            </span>
          )}
        </Link>
      </div>

      {/* На узких экранах ссылки не помещаются в одну строку — выносим их отдельной полосой. */}
      <nav className="flex gap-5 border-t border-cream-dark/70 px-4 py-2.5 text-sm sm:hidden">
        {NAV.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              pathname === link.href ? "font-semibold text-basil" : "text-ink-soft"
            }
          >
            {link.label}
          </Link>
        ))}
        <a href={`tel:${RESTAURANT.phoneHref}`} className="ml-auto text-ink-soft">
          Позвонить
        </a>
      </nav>
    </header>
  );
}
