/** Иконки одним набором: 24×24, stroke currentColor. Никаких эмодзи в интерфейсе. */
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: Props) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const ChevronDown = (p: Props) => (
  <Base {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);

export const Plus = (p: Props) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const Minus = (p: Props) => (
  <Base {...p}>
    <path d="M5 12h14" />
  </Base>
);

export const Check = (p: Props) => (
  <Base {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Base>
);

export const Close = (p: Props) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const Cart = (p: Props) => (
  <Base {...p}>
    <path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.55L20.5 8H6" />
    <circle cx="10" cy="20" r="1.4" />
    <circle cx="17" cy="20" r="1.4" />
  </Base>
);

export const Clock = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Base>
);

export const Pin = (p: Props) => (
  <Base {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </Base>
);

export const Phone = (p: Props) => (
  <Base {...p}>
    <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z" />
  </Base>
);

export const Star = (p: Props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
    <path d="M12 3.2l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.6l6-.8z" />
  </svg>
);

export const Flame = (p: Props) => (
  <Base {...p}>
    <path d="M12 3s5 4 5 8.5a5 5 0 0 1-10 0C7 9 9 7 9 7s0 2 1.5 2.5C11 8 12 6 12 3z" />
  </Base>
);

export const Leaf = (p: Props) => (
  <Base {...p}>
    <path d="M4 20c0-8 6-13 16-14 0 10-5 15-13 15H4z" />
    <path d="M9 15c2-3 5-5 8-6" />
  </Base>
);

export const Chat = (p: Props) => (
  <Base {...p}>
    <path d="M4 5.5h16v11H9l-5 3.5v-3.5H4z" />
    <path d="M8.5 10.5h7" />
  </Base>
);

export const Menu = (p: Props) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const Calendar = (p: Props) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
  </Base>
);

export const Users = (p: Props) => (
  <Base {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 6.2a3 3 0 0 1 0 5.6M17 14.8c2.2.5 3.5 2.3 3.5 4.7" />
  </Base>
);

export const Gift = (p: Props) => (
  <Base {...p}>
    <rect x="3.5" y="9" width="17" height="11" rx="2" />
    <path d="M3.5 13.5h17M12 9v11" />
    <path d="M12 9S10.5 4.5 8 4.5a2.2 2.2 0 0 0 0 4.5zM12 9s1.5-4.5 4-4.5a2.2 2.2 0 0 1 0 4.5z" />
  </Base>
);

export const Sparkle = (p: Props) => (
  <Base {...p}>
    <path d="M12 3l1.8 5.4L19 10.2l-5.2 1.8L12 17.4l-1.8-5.4L5 10.2l5.2-1.8z" />
  </Base>
);
