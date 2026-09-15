"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/** Одна кривая на весь сайт — иначе анимации выглядят собранными из разных мест. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/*
 * Появление — только сдвиг, без прозрачности.
 *
 * Блок, который по умолчанию стоит в opacity: 0, не виден никому, у кого не отработал
 * JS: ни поисковику, ни детектору вёрстки, ни сервису скриншотов. Проверено детектором
 * impeccable — он честно нашёл на этой странице «текст с контрастом 1.4:1», потому что
 * секция ниже экрана так и висела невидимой. Движение читается и от видимого состояния.
 */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const item: Variants = {
  hidden: { y: 14 },
  show: { y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** Список, который выезжает по очереди: помогает взгляду идти по сетке, а не хвататься за всё разом. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}
