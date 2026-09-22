/**
 * Иконочный набор страницы. Все знаки нарисованы в одной сетке 24×24,
 * одной толщиной штриха (1.5) и с одинаковыми скруглениями, поэтому ряд
 * иконок читается как один набор. Юникод-символы вместо иконок не ставим.
 */

export type IconName =
  | "layers"
  | "cart"
  | "spark"
  | "send"
  | "flow"
  | "refresh"
  | "target"
  | "arrow-up-right"
  | "arrow-right"
  | "plus"
  | "check"
  | "telegram"
  | "instagram"
  | "mail";

const paths: Record<IconName, React.ReactNode> = {
  layers: (
    <>
      <path d="M12 3.5 3.75 8 12 12.5 20.25 8 12 3.5Z" />
      <path d="m3.75 12.5 8.25 4.5 8.25-4.5" />
      <path d="m3.75 16.75 8.25 4.5 8.25-4.5" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.25L19.8 7H6.1" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17" cy="19.5" r="1.4" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3.2 13.9 9 19.8 10.9 13.9 12.8 12 18.6 10.1 12.8 4.2 10.9 10.1 9 12 3.2Z" />
      <path d="m18.4 16.4.8 2.3 2.3.8-2.3.8-.8 2.3-.8-2.3-2.3-.8 2.3-.8.8-2.3Z" />
    </>
  ),
  send: (
    <>
      <path d="M21 3.6 2.9 10.4a.5.5 0 0 0 .05.95l4.9 1.45 1.6 5.2a.5.5 0 0 0 .9.14l2.4-3.3 4.6 3.4a.5.5 0 0 0 .78-.28L21 3.6Z" />
      <path d="m9.85 12.8 11.15-9.2-11.8 11" />
    </>
  ),
  flow: (
    <>
      <rect x="2.75" y="3.5" width="6" height="5" rx="1.4" />
      <rect x="15.25" y="3.5" width="6" height="5" rx="1.4" />
      <rect x="9" y="15.5" width="6" height="5" rx="1.4" />
      <path d="M5.75 8.5v3.4a1.6 1.6 0 0 0 1.6 1.6h9.3a1.6 1.6 0 0 0 1.6-1.6V8.5" />
      <path d="M12 13.5v2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.2 12a8.2 8.2 0 0 1-14.4 5.3" />
      <path d="M3.8 12a8.2 8.2 0 0 1 14.4-5.3" />
      <path d="M18.4 3.1v3.7h-3.7" />
      <path d="M5.6 20.9v-3.7h3.7" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  "arrow-up-right": (
    <>
      <path d="M7.4 16.6 16.6 7.4" />
      <path d="M8.9 7.4h7.7v7.7" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M4.5 12h15" />
      <path d="m13.6 6.1 5.9 5.9-5.9 5.9" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </>
  ),
  check: (
    <>
      <path d="m4.8 12.6 4.6 4.6 9.8-10.4" />
    </>
  ),
  telegram: (
    <>
      <path d="M21.2 4.3 2.9 11.2a.45.45 0 0 0 .03.85l4.55 1.4 1.7 5.2a.45.45 0 0 0 .8.13l2.42-2.9 4.5 3.3a.45.45 0 0 0 .71-.26l3.9-14.06a.45.45 0 0 0-.31-.56Z" />
      <path d="m7.48 13.45 10.5-6.6-6.76 8.03-.29 3.5" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.3" y="3.3" width="17.4" height="17.4" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.1" cy="6.9" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  mail: (
    <>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.6" />
      <path d="m3.6 7.2 7.5 5.2a1.6 1.6 0 0 0 1.8 0l7.5-5.2" />
    </>
  ),
};

export function Icon({
  name,
  className,
  size = 20,
  style,
}: {
  name: IconName;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
