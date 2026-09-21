"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Боковая навигация админки. Пунктов ровно два, потому что экранов ровно два:
 * рисовать рельс из восьми иконок, семь из которых ведут в никуда, — обман.
 */
const LINKS = [
  {
    href: "/admin",
    label: "Сводка",
    icon: (
      <>
        <path d="M4 13h5v7H4zM10 7h5v13h-5zM16 10h5v10h-5z" />
      </>
    ),
  },
  {
    href: "/admin/orders",
    label: "Заказы",
    icon: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </>
    ),
  },
] as const;

export function NavRail() {
  const pathname = usePathname();

  return (
    <nav aria-label="Разделы админки" className="flex flex-col gap-2">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            title={link.label}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
              active
                ? "bg-ink text-white"
                : "text-slate hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              {link.icon}
            </svg>
            <span className="sr-only">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
