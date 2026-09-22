import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { about } from "@/content/site";

/**
 * Единственная секция, где говорит человек, а не услуга. Поэтому здесь
 * нет ни карточек, ни иконок: только имя крупно, два абзаца в ширину
 * чтения и три опоры на хайрлайнах.
 */
export function About() {
  return (
    <section id="about" className="section">
      <div className="shell">
        <Reveal className="section-head">
          <div className="hairline flex items-baseline gap-3 pt-5">
            <span className="label tnum" style={{ color: "var(--color-acid)" }}>
              {about.index}
            </span>
            <span className="label tnum" aria-hidden="true">
              / 08
            </span>
            <span className="label ml-2">{about.kicker}</span>
          </div>
        </Reveal>

        <div className="grid gap-x-16 gap-y-10 md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] md:items-start">
          <Reveal>
            <h2 className="display-section">{about.title}</h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex flex-col gap-5">
              {about.paragraphs.map((p) => (
                <p key={p.slice(0, 24)} className="lead" style={{ color: "var(--color-fg)" }}>
                  {p}
                </p>
              ))}
              <a href={about.cta.href} className="btn btn-ghost mt-2 self-start">
                {about.cta.label}
                <Icon name="arrow-up-right" size={15} />
              </a>
            </div>
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-px md:mt-24 md:grid-cols-3">
          {about.pillars.map((pillar, i) => (
            <Reveal
              as="li"
              key={pillar.title}
              delay={Math.min(i, 3) * 80}
              className="hairline pt-6 md:pr-10"
            >
              <h3 className="display text-[1.15rem]" style={{ fontWeight: 700 }}>
                {pillar.title}
              </h3>
              <p
                className="mt-3 text-[0.9375rem] leading-[1.55]"
                style={{ color: "var(--color-fg-soft)" }}
              >
                {pillar.body}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
