"use client";

import { useEffect } from "react";

/**
 * Один наблюдатель на всю страницу: показывает любой элемент с data-reveal,
 * когда он въезжает в кадр. MutationObserver нужен, потому что карточки меню
 * появляются после фильтрации — их тоже надо подхватывать.
 *
 * Отдельный случай — data-reveal-mask: строка внутри overflow: hidden сдвинута
 * ниже маски и для наблюдателя выглядит полностью невидимой, поэтому сама она
 * не сработает никогда. У таких блоков триггером служит сама маска.
 *
 * Смысл в том, что сами секции остаются серверными компонентами: им хватает
 * атрибута, клиентский код здесь ровно один.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tracked = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );

    function scan() {
      const targets = document.querySelectorAll(
        "[data-reveal]:not(.is-revealed), [data-reveal-mask]:not(.is-revealed)",
      );
      for (const element of targets) {
        if (tracked.has(element)) continue;
        tracked.add(element);
        observer.observe(element);
      }
    }

    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
