"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Число, которое досчитывает до значения, когда доезжает до экрана.
 * Считает один раз: повторный отсчёт при каждом проходе мимо блока раздражает.
 */
export function Counter({
  to,
  decimals = 0,
  unit,
  duration = 1500,
}: {
  to: number;
  decimals?: number;
  unit?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }

    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const started = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - started) / duration);
          // easeOutExpo: быстрый старт и мягкая посадка на финальное число.
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setValue(to * eased);
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  const text = value.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className="hx-stat__value">
      {text}
      {unit && <span className="hx-stat__unit">{unit}</span>}
    </span>
  );
}
