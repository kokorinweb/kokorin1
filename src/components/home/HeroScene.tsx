"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { EASE } from "@/components/motion/Stagger";

type HeroSceneProps = {
  /** Заголовок построчно — каждая строка выезжает из-под собственной маски. */
  titleLines: string[];
  lead: string;
  phone: string;
  phoneHref: string;
  /** Фото из /public или null — тогда кадр остаётся градиентным. */
  image: string | null;
};

export function HeroScene({ titleLines, lead, phone, phoneHref, image }: HeroSceneProps) {
  const runway = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // 0 — герой только приклеился, 1 — разгон кончился и кадр уходит наверх.
  const { scrollYProgress } = useScroll({
    target: runway,
    offset: ["start start", "end start"],
  });

  const mediaScale = useTransform(scrollYProgress, [0, 1], [1, 1.4]);
  const mediaY = useTransform(scrollYProgress, [0, 1], ["0%", "-7%"]);
  // Затемнение растёт вместе с зумом: к приходу манифеста кадр уже глубокий фон, а не сюжет.
  const scrimOpacity = useTransform(scrollYProgress, [0, 0.6], [0.5, 0.88]);
  // Текст обязан уйти раньше, чем снизу приедет манифест, иначе они накладываются.
  const contentY = useTransform(scrollYProgress, [0, 0.45], [0, 140]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  const mediaStyle = reduce ? undefined : { scale: mediaScale, y: mediaY };
  const contentStyle = reduce ? undefined : { y: contentY, opacity: contentOpacity };

  return (
    <div
      ref={runway}
      className="hero-runway relative"
      style={{ marginTop: "calc(var(--header-h) * -1)" }}
    >
      {/* data-dark — метка для шапки: пока эта секция под ней, шапка держится прозрачной. */}
      <div
        data-dark
        className="sticky top-0 flex h-dvh flex-col overflow-hidden bg-basil-dark text-on-basil"
      >
        <motion.div className="absolute inset-0" style={mediaStyle}>
          {/* База кадра. Работает и без фотографии — просто как тёмный вечерний зал. */}
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_15%,#3a6b49_0%,#23472f_45%,#161f18_100%)]" />
          {image && <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />}
          <div className="noise absolute inset-0" />
        </motion.div>

        {/* Скрим: под текстом всегда достаточно тёмно, какое бы фото ни положили. */}
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,31,24,0.8)_0%,rgba(22,31,24,0.22)_30%,rgba(22,31,24,0.6)_62%,rgba(22,31,24,0.93)_100%)]"
          style={reduce ? undefined : { opacity: scrimOpacity }}
        />

        <motion.div
          className="relative z-10 flex h-full flex-col justify-end px-5 pb-10 pt-[calc(var(--header-h)+2rem)] sm:px-8 sm:pb-12"
          style={contentStyle}
        >
          <h1 className="display text-[clamp(2.25rem,10.5vw,12rem)] font-normal leading-[0.92] tracking-[-0.03em]">
            {titleLines.map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block"
                  initial={{ y: "115%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 1.05, delay: 0.12 + i * 0.11, ease: EASE }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-md text-sm leading-relaxed text-on-basil sm:text-base">{lead}</p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/menu"
                className="w-full rounded-full bg-on-basil px-7 py-3.5 text-center font-semibold text-basil-dark transition-transform duration-300 hover:scale-[1.03] hover:bg-shell sm:w-auto"
              >
                Смотреть меню
              </Link>
              <a
                href={`tel:${phoneHref}`}
                className="w-full rounded-full border border-on-basil/45 px-7 py-3.5 text-center font-semibold text-on-basil transition-colors duration-300 hover:border-on-basil hover:bg-on-basil hover:text-basil-dark sm:w-auto"
              >
                Забронировать стол
              </a>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-on-basil-soft">
            <ScrollCue />
            <span>{phone}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Подсказка «здесь листают»: полоска, по которой бесконечно едет светлый отрезок. */
function ScrollCue() {
  const reduce = useReducedMotion();

  return (
    <span className="relative h-px w-14 overflow-hidden bg-on-basil-soft/40" aria-hidden>
      {!reduce && (
        <motion.span
          className="absolute inset-y-0 w-1/2 bg-on-basil"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
        />
      )}
    </span>
  );
}
