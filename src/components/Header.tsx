"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CartIcon } from "./icons";
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
  const ref = useRef<HTMLElement>(null);

  /** false — под шапкой тёмная секция и она растворяется; true — обычная кремовая полоса. */
  const [solid, setSolid] = useState(pathname !== "/");

  // Герой уезжает ровно под шапку, поэтому её реальную высоту знает только она сама.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = () =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /*
   * Шапка светлеет не по «проскроллили столько-то», а по тому, что реально лежит под ней:
   * следим за секциями с data-dark и сжимаем зону наблюдения до полосы высотой с шапку.
   * Так переключение попадает точно в край тёмного блока на любой высоте экрана.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;
    const underHeader = new Set<Element>();

    const connect = () => {
      observer?.disconnect();
      underHeader.clear();

      const targets = document.querySelectorAll("[data-dark]");
      if (targets.length === 0) {
        setSolid(true);
        return;
      }

      const rest = Math.max(0, window.innerHeight - el.offsetHeight);
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) underHeader.add(entry.target);
            else underHeader.delete(entry.target);
          }
          setSolid(underHeader.size === 0);
        },
        { rootMargin: `0px 0px -${rest}px 0px` },
      );

      targets.forEach((target) => observer?.observe(target));
    };

    connect();
    window.addEventListener("resize", connect);
    return () => {
      window.removeEventListener("resize", connect);
      observer?.disconnect();
    };
  }, [pathname]);

  const link = solid
    ? "text-ink-soft transition-colors hover:text-basil"
    : "text-on-basil-soft transition-colors hover:text-on-basil";
  const activeLink = solid ? "font-semibold text-basil" : "font-semibold text-on-basil";

  return (
    <header
      ref={ref}
      className={`sticky top-0 z-40 border-b transition-colors duration-500 ${
        solid
          ? "border-plaster-dark/80 bg-plaster/85 backdrop-blur"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <span
            className={`display text-2xl transition-colors duration-500 ${
              solid ? "text-basil" : "text-on-basil"
            }`}
          >
            Osteria
          </span>
          <span
            className={`display text-2xl transition-colors duration-500 ${
              solid ? "text-terracotta" : "text-gold"
            }`}
          >
            Bellini
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm sm:flex">
          {NAV.map((navLink) => (
            <Link
              key={navLink.href}
              href={navLink.href}
              className={pathname === navLink.href ? activeLink : link}
            >
              {navLink.label}
            </Link>
          ))}
          <a href={`tel:${RESTAURANT.phoneHref}`} className={link}>
            {RESTAURANT.phone}
          </a>
        </nav>

        <Link
          href="/cart"
          className={`ml-auto inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-500 sm:ml-0 ${
            solid
              ? "bg-basil text-on-basil hover:bg-basil-dark"
              : "bg-on-basil text-basil-dark hover:bg-shell"
          }`}
          aria-label={`Корзина, ${count} позиций`}
        >
          <CartIcon className="h-[18px] w-[18px]" />
          <span className="hidden sm:inline">Корзина</span>
          {hydrated && count > 0 && (
            /* key={count} — каждое изменение пересоздаёт элемент, и счётчик отпружинивает. */
            <motion.span
              key={count}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 20 }}
              className={`inline-flex min-w-6 justify-center rounded-full px-1.5 text-xs font-bold ${
                solid ? "bg-on-basil text-basil" : "bg-basil text-on-basil"
              }`}
            >
              {count}
            </motion.span>
          )}
        </Link>
      </div>

      {/* На узких экранах ссылки не помещаются в одну строку — выносим их отдельной полосой. */}
      <nav
        className={`flex gap-5 border-t px-4 text-sm transition-colors duration-500 sm:hidden ${
          solid ? "border-plaster-dark/70" : "border-on-basil/15"
        }`}
      >
        {NAV.map((navLink) => (
          <Link
            key={navLink.href}
            href={navLink.href}
            className={`flex items-center py-3 ${pathname === navLink.href ? activeLink : link}`}
          >
            {navLink.label}
          </Link>
        ))}
        <a
          href={`tel:${RESTAURANT.phoneHref}`}
          className={`ml-auto flex items-center py-3 ${link}`}
        >
          Позвонить
        </a>
      </nav>
    </header>
  );
}
