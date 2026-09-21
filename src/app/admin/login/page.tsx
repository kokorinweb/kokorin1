import Link from "next/link";
import { redirect } from "next/navigation";
import { adminConfigured, currentSession } from "@/lib/auth";
import { RESTAURANT } from "@/lib/restaurant";
import { login } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (await currentSession()) redirect("/admin");

  const message =
    error === "rate"
      ? "Слишком много попыток. Подождите минуту."
      : error === "wrong"
        ? "Неверный пароль."
        : null;

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-base font-bold text-white"
          >
            B
          </span>
          <span className="text-sm leading-tight font-bold">{RESTAURANT.name}</span>
        </div>
        <h1 className="mt-5 text-[1.375rem] font-bold">Панель заказов</h1>

        {adminConfigured() ? (
          <>
            <form action={login} className="mt-6 space-y-3">
              <label className="block text-sm font-medium text-ink-soft" htmlFor="password">
                Пароль смены
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent-strong"
              >
                Войти
              </button>
            </form>

            {message ? (
              <p className="mt-4 rounded-xl bg-warn-tint px-4 py-3 text-sm text-warn">
                {message}
              </p>
            ) : null}
          </>
        ) : (
          /*
           * Пустой пароль по умолчанию означал бы открытую наружу базу телефонов
           * и адресов клиентов. Поэтому без ADMIN_PASSWORD админка просто закрыта.
           */
          <div className="mt-6 space-y-3 text-sm text-ink-soft">
            <p className="rounded-xl bg-gold-tint px-4 py-3 text-gold-ink">
              Админка отключена: не задан <code className="font-mono">ADMIN_PASSWORD</code>.
            </p>
            <p>
              Добавьте переменную в <code className="font-mono">.env.local</code> (или в
              настройки деплоя) и перезапустите приложение.
            </p>
          </div>
        )}

        <Link href="/" className="mt-6 inline-block text-sm text-ink-muted underline">
          ← На сайт
        </Link>
      </div>
    </div>
  );
}
