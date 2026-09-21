import { NavRail } from "./NavRail";
import { logout } from "@/app/admin/actions";
import { RESTAURANT } from "@/lib/restaurant";

/** Дата в шапке — как в мокапе: «Сегодня, пн 22 сен». */
function today(): string {
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: RESTAURANT.timezone,
  }).format(new Date());

  return `Сегодня, ${formatted}`;
}

export function Shell({
  title,
  subtitle,
  actions,
  /** Номер заказа — идентификатор, а не название: антиква ему не идёт. */
  monoTitle = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  monoTitle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1400px] gap-4 p-4 md:p-6">
      <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-20 shrink-0 flex-col items-center justify-between rounded-3xl bg-white py-5 shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)] md:flex">
        <div className="flex flex-col items-center gap-5">
          <span
            aria-hidden="true"
            className="display flex h-11 w-11 items-center justify-center rounded-2xl bg-basil text-lg text-white"
          >
            B
          </span>
          <NavRail />
        </div>

        <form action={logout}>
          <button
            type="submit"
            title="Выйти"
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate transition hover:bg-terracotta/10 hover:text-terracotta"
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
              <path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
            </svg>
            <span className="sr-only">Выйти</span>
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white px-5 py-4 shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">
              {RESTAURANT.name}
            </p>
            <h1
              className={`truncate text-2xl leading-tight ${
                monoTitle ? "font-semibold tracking-tight tabular-nums" : "display"
              }`}
            >
              {title}
            </h1>
            {subtitle ? <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p> : null}
          </div>

          <div className="flex items-center gap-3">
            {actions}
            <span className="hidden rounded-full bg-panel px-3 py-1.5 text-sm font-medium text-ink-soft sm:inline">
              {today()}
            </span>
          </div>
        </header>

        {/* Мобильная навигация: рельса слева спрятана, ссылки нужны всё равно. */}
        <div className="flex gap-2 md:hidden">
          <a
            href="/admin"
            className="flex-1 rounded-2xl bg-white px-4 py-2 text-center text-sm font-medium shadow-sm"
          >
            Сводка
          </a>
          <a
            href="/admin/orders"
            className="flex-1 rounded-2xl bg-white px-4 py-2 text-center text-sm font-medium shadow-sm"
          >
            Заказы
          </a>
          <form action={logout} className="shrink-0">
            <button
              type="submit"
              className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-terracotta shadow-sm"
            >
              Выйти
            </button>
          </form>
        </div>

        {children}
      </div>
    </div>
  );
}
