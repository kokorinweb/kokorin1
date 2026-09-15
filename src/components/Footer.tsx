import Link from "next/link";
import { RESTAURANT } from "@/lib/restaurant";

export function Footer() {
  return (
    <footer id="contacts" className="mt-24 border-t border-plaster-dark bg-plaster-dark/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <div className="display text-2xl">
            <span className="text-basil">Osteria</span> <span className="text-terracotta">Bellini</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
            {RESTAURANT.tagline}. Работаем с 2014 года, тесто ставим каждое утро, пасту катаем
            вручную.
          </p>
        </div>

        <div className="text-sm">
          <h2 className="display text-lg">Контакты</h2>
          <ul className="mt-3 space-y-1 text-ink-soft">
            <li>{RESTAURANT.address}</li>
            <li>{RESTAURANT.metro}</li>
            <li>
              <a className="inline-flex min-h-11 items-center hover:text-basil" href={`tel:${RESTAURANT.phoneHref}`}>
                {RESTAURANT.phone}
              </a>
            </li>
            <li>
              <a className="inline-flex min-h-11 items-center hover:text-basil" href={`mailto:${RESTAURANT.email}`}>
                {RESTAURANT.email}
              </a>
            </li>
            <li>
              <a className="inline-flex min-h-11 items-center hover:text-basil" href={RESTAURANT.telegram}>
                Наш Telegram-бот
              </a>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <h2 className="display text-lg">Часы работы</h2>
          <ul className="mt-3 space-y-2 text-ink-soft">
            {RESTAURANT.hours.map((row) => (
              <li key={row.days} className="flex justify-between gap-4">
                <span>{row.days}</span>
                <span className="tabular-nums">{row.time}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/menu"
            className="mt-5 inline-flex min-h-11 items-center rounded-full border border-basil px-5 py-2 font-semibold text-basil transition-colors hover:bg-basil hover:text-plaster"
          >
            Смотреть меню
          </Link>
        </div>
      </div>

      <div className="border-t border-plaster-dark px-4 py-5 text-center text-xs text-ink-soft sm:px-6">
        © {new Date().getFullYear()} {RESTAURANT.name}. Демонстрационный проект: онлайн-оплата не
        подключена, заказ подтверждает менеджер по телефону.
      </div>
    </footer>
  );
}
