"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * reducedMotion="user" — один выключатель на все анимации сайта: при системной
 * настройке «уменьшить движение» Motion сам глушит трансформы и оставляет прозрачность.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
