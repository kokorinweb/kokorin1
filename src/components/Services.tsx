"use client";

import { useState } from "react";
import { Icon, type IconName } from "./Icon";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { services } from "@/content/site";

/**
 * Семь услуг собраны реестром, а не сеткой одинаковых карточек: строка
 * несёт номер, название и подробности, а высота строки задаётся её
 * собственным содержанием. Ряд читается как указатель, по которому можно
 * вести взглядом сверху вниз.
 */
export function Services() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section id="services" className="section">
      <div className="shell">
        <SectionHead
          index={services.index}
          kicker={services.kicker}
          title={services.title}
          lead={services.lead}
        />

        <ul className="border-t border-b" style={{ borderColor: "var(--color-line)" }}>
          {services.items.map((item, i) => {
            const isHot = hovered === item.n;
            return (
              <Reveal as="li" key={item.n} delay={Math.min(i, 3) * 60}>
                <a
                  href={services.cta.href}
                  onMouseEnter={() => setHovered(item.n)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(item.n)}
                  onBlur={() => setHovered(null)}
                  className="group relative grid gap-x-8 gap-y-4 py-7 md:grid-cols-[3.5rem_minmax(0,17rem)_minmax(0,1fr)_auto] md:items-start md:py-9"
                  style={{
                    borderBottom: "1px solid var(--color-line)",
                    marginBottom: "-1px",
                  }}
                >
                  {/* Заливка строки при наведении — от акцента, без ореола */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-[-1rem] inset-y-0 -z-10 rounded-2xl transition-opacity duration-300"
                    style={{
                      backgroundColor: "var(--color-acid-wash)",
                      opacity: isHot ? 1 : 0,
                      transitionTimingFunction: "var(--ease-out-soft)",
                    }}
                  />

                  <span
                    className="label tnum pt-1 transition-colors duration-300"
                    style={{ color: isHot ? "var(--color-acid)" : undefined }}
                  >
                    {item.n}
                  </span>

                  <h3 className="flex items-start gap-3.5">
                    <Icon
                      name={item.icon as IconName}
                      size={22}
                      className="mt-0.5 shrink-0 transition-colors duration-300"
                      style={
                        {
                          color: isHot ? "var(--color-acid)" : "var(--color-fg-mute)",
                        } as React.CSSProperties
                      }
                    />
                    <span
                      className="display text-[clamp(1.35rem,2.1vw,1.9rem)]"
                      style={{ fontWeight: 700, lineHeight: 1.04 }}
                    >
                      {item.title}
                    </span>
                  </h3>

                  <div className="md:pt-1">
                    {"bullets" in item && item.bullets ? (
                      <>
                        <p className="text-[0.9rem]" style={{ color: "var(--color-fg-mute)" }}>
                          {item.intro}
                        </p>
                        <ul className="mt-2.5 flex flex-wrap gap-x-2 gap-y-2">
                          {item.bullets.map((b) => (
                            <li
                              key={b}
                              className="rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors duration-300"
                              style={{
                                borderColor: isHot
                                  ? "var(--color-line-strong)"
                                  : "var(--color-line)",
                                color: "var(--color-fg-soft)",
                              }}
                            >
                              {b}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p
                        className="text-[0.9375rem] leading-[1.55]"
                        style={{ color: "var(--color-fg-soft)", maxWidth: "46ch" }}
                      >
                        {"body" in item ? item.body : null}
                      </p>
                    )}
                  </div>

                  <span
                    className="label flex items-center gap-2 transition-all duration-300 md:pt-1"
                    style={{
                      color: isHot ? "var(--color-acid)" : "var(--color-fg-mute)",
                      transitionTimingFunction: "var(--ease-out-soft)",
                    }}
                  >
                    {services.linkLabel}
                    <Icon
                      name="arrow-right"
                      size={15}
                      className="transition-transform duration-300"
                      style={
                        {
                          transform: isHot ? "translateX(4px)" : "none",
                          transitionTimingFunction: "var(--ease-out-soft)",
                        } as React.CSSProperties
                      }
                    />
                  </span>
                </a>
              </Reveal>
            );
          })}
        </ul>

        <Reveal className="mt-10">
          <a href={services.cta.href} className="btn btn-primary">
            {services.cta.label}
            <Icon name="arrow-up-right" size={15} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
