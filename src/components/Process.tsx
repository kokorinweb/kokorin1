import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { process } from "@/content/site";

/**
 * Четыре шага идут по одной рельсе: номер сидит на линии, и линия
 * действительно связывает шаги, а не просто разделяет колонки.
 */
export function Process() {
  return (
    <section id="process" className="section">
      <div className="shell">
        <SectionHead
          index={process.index}
          kicker={process.kicker}
          title={process.title}
          lead={process.lead}
        />

        <ol className="relative grid gap-10 md:grid-cols-4 md:gap-8">
          {/* Рельса тянется только между первым и последним узлом */}
          <span
            aria-hidden="true"
            className="absolute left-[calc(12.5%_-_0px)] right-[12.5%] top-[0.4375rem] hidden h-px md:block"
            style={{ backgroundColor: "var(--color-line-strong)" }}
          />

          {process.steps.map((step, i) => (
            <Reveal as="li" key={step.n} delay={Math.min(i, 3) * 90} className="relative">
              <span
                aria-hidden="true"
                className="relative z-10 mb-7 block h-3.5 w-3.5 rounded-full border-2 md:mx-auto"
                style={{
                  borderColor: i === 0 ? "var(--color-acid)" : "var(--color-line-strong)",
                  backgroundColor: i === 0 ? "var(--color-acid)" : "var(--color-ink)",
                }}
              />
              <div className="md:text-center">
                <p className="display-number tnum text-[3.25rem]" style={{ color: "var(--color-fg-mute)" }}>
                  {step.n}
                </p>
                <h3
                  className="display mt-4 whitespace-pre-line text-[1.25rem]"
                  style={{ fontWeight: 700, lineHeight: 1.12 }}
                >
                  {step.title}
                </h3>
                <p
                  className="mt-3 text-[0.9375rem] leading-[1.55]"
                  style={{ color: "var(--color-fg-soft)" }}
                >
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-14">
          <a href={process.cta.href} className="btn btn-primary">
            {process.cta.label}
            <Icon name="arrow-up-right" size={15} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
