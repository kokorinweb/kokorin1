import Link from "next/link";

/**
 * Набор элементов панели. Один словарь на все экраны: кнопка «Сохранить» на
 * брони и на новом заказе — это одна и та же кнопка, иначе одна из них лишняя.
 *
 * Глубина расходуется по роли, а не ставится всем подряд: карточка держится на
 * волосяной границе, тень остаётся всплывающим слоям — меню и уведомлению.
 */

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-white ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHead({
  title,
  hint,
  actions,
}: {
  title: string;
  hint?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 className="text-[0.9375rem] font-bold">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
      </div>
      {actions}
    </div>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55";

const BUTTON_TONE = {
  primary: "bg-accent px-4 py-2.5 text-white hover:bg-accent-strong",
  soft: "bg-tint px-4 py-2.5 text-ink hover:bg-line",
  ghost: "px-3 py-2.5 text-ink-muted underline hover:text-ink",
  danger: "bg-warn-tint px-4 py-2.5 text-warn hover:bg-warn/15",
} as const;

export type ButtonTone = keyof typeof BUTTON_TONE;

export function Button({
  tone = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return <button {...props} className={`${BUTTON_BASE} ${BUTTON_TONE[tone]} ${className}`} />;
}

export function ButtonLink({
  href,
  tone = "soft",
  className = "",
  children,
}: {
  href: string;
  tone?: ButtonTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${BUTTON_BASE} ${BUTTON_TONE[tone]} ${className}`}>
      {children}
    </Link>
  );
}

/** Поля ввода классами, а не обёртками: их ставят и серверные формы тоже. */
export const INPUT_CLASS =
  "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted outline-none transition focus:border-accent focus:bg-white";

export const SELECT_CLASS =
  "rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:bg-white";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-warn">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/** Пустое состояние объясняет, что делать дальше, а не сообщает «ничего нет». */
export function Empty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="py-12 text-center">
      <p className="font-semibold">{title}</p>
      {hint ? <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">{hint}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}

/** Скелетон повторяет форму содержимого: спиннер посреди экрана ничего не сообщает. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-tint ${className}`} />;
}

export function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}
    >
      {children}
    </span>
  );
}
