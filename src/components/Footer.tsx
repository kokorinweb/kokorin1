import Link from "next/link";
import { Logo } from "./Logo";
import { INSTAGRAM_NOTE, RESTAURANT, SOCIALS } from "@/lib/restaurant";

const COLUMNS = [
  {
    title: "Ресторан",
    links: [
      { href: "/menu", label: "Меню" },
      { href: "/booking", label: "Бронирование" },
      { href: "/#about", label: "О ресторане" },
      { href: "/#chef", label: "Шеф-повар" },
    ],
  },
  {
    title: "Гостям",
    links: [
      { href: "/#events", label: "Акции и события" },
      { href: "/#sets", label: "Сеты" },
      { href: "/#certificates", label: "Сертификаты" },
      { href: "/#contacts", label: "Контакты" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-text-dim">
              {RESTAURANT.tagline[0].toUpperCase() + RESTAURANT.tagline.slice(1)}. Работаем
              с {RESTAURANT.since} года.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="label text-text-faint">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.9375rem] text-text-dim transition-colors hover:text-shu"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <p className="label text-text-faint">Контакты</p>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-text-dim">
              <li>
                <a href={`tel:${RESTAURANT.phoneHref}`} className="transition-colors hover:text-shu">
                  {RESTAURANT.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${RESTAURANT.email}`} className="transition-colors hover:text-shu">
                  {RESTAURANT.email}
                </a>
              </li>
              <li>{RESTAURANT.address}</li>
            </ul>
            <ul className="mt-5 flex flex-wrap gap-2">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="label inline-block rounded-full border border-line px-3.5 py-2 text-text-dim transition-colors hover:border-shu hover:text-shu"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 text-xs text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {RESTAURANT.name}. {INSTAGRAM_NOTE}
          </p>
          <Link href="/privacy" className="transition-colors hover:text-text-dim">
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </footer>
  );
}
