"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { nav, site } from "@/content/site";

export function Nav() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Подсветка текущего раздела: читаем те же якоря, что в меню.
  useEffect(() => {
    const ids = nav.items.map((i) => i.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setActive(`#${hit.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((s) => io.observe(s));

    // Наблюдатель только назначает раздел и никогда не снимает его, поэтому
    // на первом экране подсветка осталась бы от последнего просмотренного.
    const clearAtTop = () => {
      if (window.scrollY < window.innerHeight * 0.6) setActive("");
    };
    clearAtTop();
    window.addEventListener("scroll", clearAtTop, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", clearAtTop);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="shell pt-4 md:pt-5">
        <div
          className="pointer-events-auto flex items-center gap-3 rounded-full border px-3 py-2 md:px-4"
          style={{
            borderColor: stuck ? "var(--color-line-strong)" : "transparent",
            backgroundColor: stuck ? "rgba(11,11,17,0.72)" : "transparent",
            backdropFilter: stuck ? "blur(14px) saturate(140%)" : "none",
            WebkitBackdropFilter: stuck ? "blur(14px) saturate(140%)" : "none",
            transition:
              "background-color 320ms var(--ease-out-soft), border-color 320ms var(--ease-out-soft), backdrop-filter 320ms var(--ease-out-soft)",
          }}
        >
          <a
            href="#top"
            className="display shrink-0 pl-1 text-[0.95rem] leading-none tracking-[-0.02em] md:text-[1.05rem]"
            style={{ fontWeight: 800 }}
          >
            {site.brand}
          </a>

          <nav aria-label="Разделы" className="ml-auto hidden items-center gap-1 md:flex">
            {nav.items.map((item) => {
              const isActive = active === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  className="label rounded-full px-3.5 py-2 transition-colors duration-200"
                  style={{ color: isActive ? "var(--color-acid)" : undefined }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = "var(--color-fg)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = "";
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <a
            href={nav.cta.href}
            className="btn btn-primary ml-auto hidden !min-h-11 !px-5 !text-[0.7rem] md:ml-2 md:inline-flex"
          >
            {nav.cta.label}
            <Icon name="arrow-up-right" size={15} />
          </a>

          <button
            type="button"
            aria-expanded={open}
            aria-controls="nav-panel"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((v) => !v)}
            className="btn btn-ghost ml-auto !min-h-11 !w-11 !px-0 md:hidden"
          >
            <span className="relative block h-3.5 w-4">
              <span
                className="absolute left-0 block h-px w-full bg-current transition-transform duration-300"
                style={{
                  top: open ? "50%" : "2px",
                  transform: open ? "rotate(45deg)" : "none",
                  transitionTimingFunction: "var(--ease-out-expo)",
                }}
              />
              <span
                className="absolute left-0 block h-px w-full bg-current transition-opacity duration-200"
                style={{ top: "50%", opacity: open ? 0 : 1 }}
              />
              <span
                className="absolute left-0 block h-px w-full bg-current transition-transform duration-300"
                style={{
                  bottom: open ? "auto" : "2px",
                  top: open ? "50%" : "auto",
                  transform: open ? "rotate(-45deg)" : "none",
                  transitionTimingFunction: "var(--ease-out-expo)",
                }}
              />
            </span>
          </button>
        </div>

        <div
          id="nav-panel"
          ref={panelRef}
          hidden={!open}
          className="pointer-events-auto mt-2 overflow-hidden rounded-3xl border md:hidden"
          style={{
            borderColor: "var(--color-line-strong)",
            backgroundColor: "rgba(11,11,17,0.94)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <nav aria-label="Разделы" className="flex flex-col p-2">
            {nav.items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="display flex items-center justify-between rounded-2xl px-4 py-3.5 text-2xl"
                style={{ fontWeight: 700 }}
              >
                {item.label}
                <Icon name="arrow-right" size={18} className="opacity-45" />
              </a>
            ))}
            <a
              href={nav.cta.href}
              onClick={() => setOpen(false)}
              className="btn btn-primary mt-2"
            >
              {nav.cta.label}
              <Icon name="arrow-up-right" size={15} />
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
