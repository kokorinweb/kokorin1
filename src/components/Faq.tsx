"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { faq } from "@/content/site";

/**
 * Аккордеон на <details>/<summary>: раскрытие, клавиатура и поиск по
 * странице работают без скрипта. Состояние держим в React только ради
 * поворота знака — разметка остаётся рабочей и без гидрации.
 */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="section">
      <div className="shell">
        <SectionHead index={faq.index} kicker={faq.kicker} title={faq.title} />

        <ul className="border-t" style={{ borderColor: "var(--color-line)" }}>
          {faq.items.map((item, i) => (
            <Reveal as="li" key={item.q} delay={Math.min(i, 3) * 55}>
              <details
                open={open === i}
                onToggle={(e) => {
                  const el = e.currentTarget;
                  setOpen((prev) => (el.open ? i : prev === i ? null : prev));
                }}
                className="border-b"
                style={{ borderColor: "var(--color-line)" }}
              >
                <summary
                  className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden"
                >
                  <h3
                    className="display text-[clamp(1.05rem,1.8vw,1.45rem)]"
                    style={{ fontWeight: 600, lineHeight: 1.2 }}
                  >
                    {item.q}
                  </h3>
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300"
                    style={{
                      borderColor: open === i ? "var(--color-acid)" : "var(--color-line-strong)",
                      color: open === i ? "var(--color-acid)" : "var(--color-fg-soft)",
                    }}
                  >
                    <Icon
                      name="plus"
                      size={16}
                      className="transition-transform duration-[420ms]"
                      style={{
                        transform: open === i ? "rotate(135deg)" : "none",
                        transitionTimingFunction: "var(--ease-out-expo)",
                      }}
                    />
                  </span>
                </summary>
                <p
                  className="pb-7 pr-12 text-[0.9375rem] leading-[1.6]"
                  style={{ color: "var(--color-fg-soft)", maxWidth: "62ch" }}
                >
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
