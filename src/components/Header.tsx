"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./CartContext";
import { Logo } from "./Logo";
import { Cart, Close, Menu } from "./Icons";
import { RESTAURANT } from "@/lib/restaurant";

const NAV = [
  { href: "/menu", label: "Меню" },
  { href: "/#about", label: "О ресторане" },
  { href: "/#events", label: "Акции" },
  { href: "/#interior", label: "Галерея" },
  { href: "/#contacts", label: "Контакты" },
];

export function Header() {
  const { count, hydrated } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Переход по ссылке в мобильном меню должен его закрывать.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? "border-b border-line bg-ink/88 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center gap-4 px-5 sm:px-8">
        <Link href="/" aria-label={`${RESTAURANT.name} — на главную`} className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Основная навигация" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-[0.9375rem] text-text-dim transition-colors hover:bg-white/5 hover:text-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={`tel:${RESTAURANT.phoneHref}`}
            className="hidden text-[0.9375rem] text-text-dim transition-colors hover:text-text xl:block"
          >
            {RESTAURANT.phone}
          </a>

          <Link
            href="/cart"
            aria-label={`Корзина${hydrated && count ? `, ${count} позиций` : ""}`}
            className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-line text-text-dim transition-colors hover:border-line-strong hover:text-text"
          >
            <Cart className="h-[22px] w-[22px]" />
            {hydrated && count > 0 ? (
              <span className="pop absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-shu px-1 text-[11px] font-bold text-ink">
                {count}
              </span>
            ) : null}
          </Link>

          <Link
            href="/booking"
            className="hidden cursor-pointer rounded-full bg-shu px-5 py-2.5 text-[0.9375rem] font-semibold text-ink transition-colors hover:bg-shu-soft sm:block"
          >
            Забронировать стол
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-line text-text lg:hidden"
          >
            {open ? <Close className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-ink lg:hidden">
          <nav aria-label="Мобильная навигация" className="px-5 py-4">
            {[{ href: "/menu", label: "Меню" }, ...NAV.slice(1)].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block border-b border-line/60 py-3.5 text-lg text-text"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-5 grid gap-3">
              <Link
                href="/booking"
                className="rounded-full bg-shu px-6 py-3.5 text-center font-semibold text-ink"
              >
                Забронировать стол
              </Link>
              <a
                href={`tel:${RESTAURANT.phoneHref}`}
                className="rounded-full border border-line px-6 py-3.5 text-center font-semibold text-text"
              >
                {RESTAURANT.phone}
              </a>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
