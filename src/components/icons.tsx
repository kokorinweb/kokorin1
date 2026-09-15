/**
 * Свой набор иконок вместо эмодзи: эмодзи рисует ОС, поэтому в каждой системе
 * они разной толщины и цвета и ни к какой сетке не относятся. Здесь один
 * viewBox 24, одна толщина штриха и currentColor.
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export function CartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.2 7.8h15.6l-1.4 9.4a2.2 2.2 0 0 1-2.2 1.9H7.8a2.2 2.2 0 0 1-2.2-1.9L4.2 7.8Z" />
      <path d="M8.8 7.8V6.4a3.2 3.2 0 0 1 6.4 0v1.4" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12.6 9.6 17 19 7" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 12h14" />
      <path d="M12.8 6.2 18.6 12l-5.8 5.8" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 6.6A2.1 2.1 0 0 1 6.6 4.5h10.8a2.1 2.1 0 0 1 2.1 2.1v7.2a2.1 2.1 0 0 1-2.1 2.1H9.4L4.5 19.5V6.6Z" />
    </svg>
  );
}
