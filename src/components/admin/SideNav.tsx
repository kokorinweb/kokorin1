"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Разделов стало пять — иконки без подписей на таком количестве уже угадываются,
 * а не читаются, поэтому боковая навигация подписана словами.
 */
type NavLink = {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
};

const LINKS: NavLink[] = [
  {
    href: "/admin",
    label: "Сводка",
    exact: true,
    icon: <path d="M4 13h5v7H4zM10 7h5v13h-5zM16 10h5v10h-5z" />,
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
  {
    href: "/admin/customers",
    label: "Гости",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      </>
    ),
  },
  {
    href: "/admin/reservations",
    label: "Брони",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M4 10h16M9 3.5v3M15 3.5v3" />
      </>
    ),
  },
  {
    href: "/admin/stoplist",
    label: "Стоп-лист",
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M7 17 17 7" />
      </>
    ),
  },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname.startsWith(href);
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.125rem] w-[1.125rem] shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Разделы панели" className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href, link.exact);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-accent-tint text-accent-strong"
                : "text-ink-soft hover:bg-tint hover:text-ink"
            }`}
          >
            <Icon>{link.icon}</Icon>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Та же навигация на узком экране: горизонтальный ряд под заголовком. */
export function TopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Разделы панели"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
    >
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href, link.exact);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
              active
                ? "border-accent/25 bg-accent-tint text-accent-strong"
                : "border-line bg-white text-ink-soft"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
