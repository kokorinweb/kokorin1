import { SideNav, TopNav } from "./SideNav";
import { MobilePrimary } from "./MobilePrimary";
import { ButtonLink } from "./ui";
import { logout } from "@/app/admin/actions";
import { RESTAURANT } from "@/lib/restaurant";

/**
 * Оболочка панели: слева подписанная навигация, справа рабочая колонка.
 *
 * Заголовок экрана несёт только имя и состояние. Надстрочной подписи с названием
 * ресторана здесь нет намеренно: название уже стоит в логотипе слева, а кикер над
 * заголовком — это подпись, которая повторяет соседнюю подпись.
 */
function today(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: RESTAURANT.timezone,
  }).format(new Date());
}

export function Shell({
  title,
  subtitle,
  actions,
  monoTitle = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Номер заказа — идентификатор: цифры в нём должны стоять ровно. */
  monoTitle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-4 sm:px-6 lg:py-6">
      <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-56 shrink-0 flex-col justify-between rounded-2xl border border-line bg-surface-2 p-4 lg:flex">
        <div>
          <div className="flex items-center gap-2.5 px-1 pb-5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-base font-bold text-white"
            >
              B
            </span>
            <span className="text-sm leading-tight font-bold">
              Osteria
              <br />
              Bellini
            </span>
          </div>

          <SideNav />

          <div className="mt-4 border-t border-line pt-4">
            <ButtonLink href="/admin/orders/new" tone="primary" className="w-full">
              Новый заказ
            </ButtonLink>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-muted transition hover:bg-warn-tint hover:text-warn"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[1.125rem] w-[1.125rem]"
              aria-hidden="true"
            >
              <path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
            </svg>
            Выйти
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1
              className={`truncate text-[1.375rem] leading-tight font-bold ${
                monoTitle ? "tabular-nums tracking-tight" : ""
              }`}
            >
              {title}
            </h1>
            {subtitle ? <p className="mt-1 text-sm text-ink-soft">{subtitle}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <span className="hidden text-sm text-ink-muted sm:inline">{today()}</span>
          </div>
        </header>

        <TopNav />

        <MobilePrimary />

        {children}
      </div>
    </div>
  );
}
