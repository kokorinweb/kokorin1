import type { ReactNode } from "react";
import { Reveal } from "./ui";

/** Рубрика над заголовком: моно, разрядка, вермилион. Общий для всех секций ритм. */
export function Kicker({ children, tone = "shu" }: { children: ReactNode; tone?: "shu" | "dim" }) {
  return (
    <p className={`label ${tone === "shu" ? "text-shu" : "text-text-faint"}`}>
      <span className="mr-2.5 inline-block h-px w-6 align-middle bg-current opacity-60" />
      {children}
    </p>
  );
}

export function SectionHeading({
  kicker,
  title,
  jp,
  lead,
  align = "left",
  tone = "dark",
  action,
}: {
  kicker?: string;
  title: ReactNode;
  jp?: string;
  lead?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  action?: ReactNode;
}) {
  const centered = align === "center";
  return (
    <Reveal
      className={`flex flex-wrap items-end gap-6 ${centered ? "flex-col text-center" : "justify-between"}`}
    >
      <div className={`max-w-2xl ${centered ? "mx-auto" : ""}`}>
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        <h2
          className={`display mt-4 text-[clamp(2rem,5vw,3.5rem)] ${
            tone === "light" ? "text-sumi" : "text-text"
          }`}
        >
          {title}
          {jp ? (
            <span className="jp ml-3 align-middle text-[0.42em] tracking-widest text-text-faint">
              {jp}
            </span>
          ) : null}
        </h2>
        {lead ? (
          <p
            className={`mt-4 text-[1.0625rem] leading-relaxed ${
              tone === "light" ? "text-sumi-soft" : "text-text-dim"
            }`}
          >
            {lead}
          </p>
        ) : null}
      </div>
      {action}
    </Reveal>
  );
}

/** Стандартная обёртка секции: одинаковые отступы и максимальная ширина везде. */
export function Section({
  id,
  children,
  className = "",
  width = "wide",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  width?: "wide" | "narrow" | "full";
}) {
  const max = width === "narrow" ? "max-w-4xl" : width === "full" ? "max-w-[1600px]" : "max-w-6xl";
  return (
    <section id={id} className={`relative px-5 py-20 sm:px-8 sm:py-28 ${className}`}>
      <div className={`mx-auto ${max}`}>{children}</div>
    </section>
  );
}

/** Тушевой разделитель между тёмной и светлой зоной. Замена «рваной бумаге» из референса. */
export function BrushDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`relative h-10 w-full overflow-hidden sm:h-16 ${flip ? "rotate-180" : ""}`}>
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        <path
          d="M0 64 V26 C 120 10, 240 44, 360 30 C 480 16, 600 46, 720 34 C 840 22, 960 50, 1080 36 C 1200 22, 1320 40, 1440 24 V64 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
