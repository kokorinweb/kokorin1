import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { cases } from "@/content/site";

/**
 * Кейсы — единственное место, где сетка честна: это действительно ряд
 * однородных работ. Монотонность снимается размером: первый кейс идёт
 * разворотом во всю ширину, остальные по двое.
 */
export function Cases() {
  // Ритм: разворот — пара — пара — разворот. Нечётный остаток
  // иначе оставляет дыру в последнем ряду.
  const [lead, ...others] = cases.items;
  const tail = others[others.length - 1];
  const middle = others.slice(0, -1);

  return (
    <section id="cases" className="section">
      <div className="shell">
        <SectionHead index={cases.index} kicker={cases.kicker} title={cases.title} />

        <div className="grid gap-4 md:gap-5">
          <Reveal>
            <CaseCard item={lead} featured />
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
            {middle.map((item, i) => (
              <Reveal key={item.id} delay={Math.min(i, 3) * 70}>
                <CaseCard item={item} />
              </Reveal>
            ))}
          </div>

          {tail ? (
            <Reveal>
              <CaseCard item={tail} featured mirror />
            </Reveal>
          ) : null}
        </div>

        <Reveal className="mt-14 grid gap-6 md:mt-20 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="display-section whitespace-pre-line">{cases.outro}</p>
          <a href={cases.cta.href} className="btn btn-primary justify-self-start">
            {cases.cta.label}
            <Icon name="arrow-up-right" size={15} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function CaseCard({
  item,
  featured = false,
  mirror = false,
}: {
  item: (typeof cases.items)[number];
  featured?: boolean;
  /** Закрывающий разворот зеркалим, чтобы два широких кейса не повторяли друг друга. */
  mirror?: boolean;
}) {
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noreferrer noopener"
      className="group surface relative block h-full overflow-hidden transition-colors duration-300"
      style={{ transitionTimingFunction: "var(--ease-out-soft)" }}
    >
      <div
        className={`grid gap-0 ${featured ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-stretch" : ""}`}
      >
        <div
          className={`relative overflow-hidden ${featured ? `${mirror ? "md:order-1" : "md:order-2"} aspect-[16/10] md:aspect-auto md:min-h-[21rem]` : "aspect-[3/2]"}`}
          style={{ backgroundColor: item.palette[0] }}
        >
          {/* Превью — собственный SVG: вектор уже масштабируется, гонять его
              через оптимизатор изображений незачем. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/shots/${item.id}-${featured ? "hero" : "split"}.svg`}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[620ms] group-hover:scale-[1.035]"
            style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
          />
          {/* Плоскость превью приглушена в покое и оживает при наведении */}
          <span
            aria-hidden="true"
            className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0"
            style={{
              backgroundColor: "var(--color-ink)",
              opacity: 0.38,
              transitionTimingFunction: "var(--ease-out-soft)",
            }}
          />
        </div>

        <div
          className={`flex flex-col gap-3 p-6 md:p-8 ${featured ? `${mirror ? "md:order-2" : "md:order-1"} md:justify-center` : ""}`}
        >
          <p className="label">{item.meta}</p>
          <h3
            className="display"
            style={{
              fontWeight: 700,
              fontSize: featured ? "clamp(2rem,3.6vw,3.25rem)" : "clamp(1.4rem,2.2vw,1.85rem)",
            }}
          >
            {item.title}
          </h3>
          <p
            className="text-[0.9375rem] leading-[1.55]"
            style={{ color: "var(--color-fg-soft)", maxWidth: "44ch" }}
          >
            {item.body}
          </p>
          <span
            className="label mt-2 flex items-center gap-2 transition-colors duration-300 group-hover:!text-[var(--color-acid)]"
          >
            {cases.linkLabel}
            <Icon
              name="arrow-up-right"
              size={15}
              className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>

      {/* Тонкая рамка светлеет при наведении — без цветного свечения */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] border opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ borderColor: "var(--color-line-strong)" }}
      />
    </a>
  );
}
