"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/** Одна кривая на весь сайт — иначе анимации выглядят как собранные из разных мест. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Насколько блок приподнят до появления, px. */
  y?: number;
};

/** Появление блока при попадании в экран. Срабатывает один раз — мигания при скролле вверх нет. */
export function Reveal({ children, className, delay = 0, y = 24 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

/** Обёртка для списков: дети выезжают по очереди, а не все разом. */
export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  /** dl — когда внутри список «термин — значение»: иначе разметка перестаёт быть валидной. */
  as?: "div" | "dl";
}) {
  const Tag = as === "dl" ? motion.dl : motion.div;

  return (
    <Tag
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}
