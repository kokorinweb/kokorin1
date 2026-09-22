"use client";

import { useEffect } from "react";

/**
 * Инерционный скролл (Lenis) плюс общий источник прогресса страницы.
 * Прогресс пишется в --page-progress на <html>, чтобы CSS и поле в первом
 * экране читали одно и то же значение и не считали скролл каждый по-своему.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let lenis: import("lenis").default | null = null;
    let raf = 0;
    let disposed = false;

    const writeProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      doc.style.setProperty("--page-progress", p.toFixed(4));
    };

    const start = async () => {
      if (reduce.matches) {
        window.addEventListener("scroll", writeProgress, { passive: true });
        writeProgress();
        return;
      }

      const { default: Lenis } = await import("lenis");
      if (disposed) return;

      lenis = new Lenis({
        duration: 1.05,
        // Экспоненциальное затухание: быстрый заход, спокойная остановка.
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
      });

      lenis.on("scroll", writeProgress);

      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      writeProgress();
    };

    void start();

    // Lenis перехватывает колесо, поэтому якорные ссылки ведём через него.
    const onAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      event.preventDefault();
      if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -72 });
      else el.scrollIntoView({ block: "start" });
      history.replaceState(null, "", id);
    };

    document.addEventListener("click", onAnchorClick);

    return () => {
      disposed = true;
      document.removeEventListener("click", onAnchorClick);
      window.removeEventListener("scroll", writeProgress);
      if (raf) cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return null;
}
