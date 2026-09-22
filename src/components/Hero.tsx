import { IrisField } from "./IrisField";
import { Icon } from "./Icon";
import { hero } from "@/content/site";

/**
 * Первый экран. Имя разложено на две строки со сдвигом, между ними проходит
 * живая масса — слова и объём лежат в одной плоскости, а не текст поверх
 * картинки. Цифры вынесены в нижнюю кромку, а не собраны в привычный ряд
 * метрик по центру.
 */
export function Hero() {
  return (
    <section id="top" className="relative min-h-[100svh] overflow-hidden">
      <IrisField className="absolute inset-0" />

      {/* Земля страницы подхватывает низ экрана, чтобы стыка с секцией не было */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
        style={{
          background: "linear-gradient(to top, var(--color-ink) 12%, transparent)",
        }}
      />

      <div className="shell relative flex min-h-[100svh] flex-col pb-10 pt-28 md:pb-14 md:pt-36">
        <p className="label flex flex-wrap items-center gap-x-3 gap-y-1">
          {hero.eyebrow.map((word, i) => (
            <span key={word} className="flex items-center gap-3">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="inline-block h-[3px] w-[3px] rounded-full"
                  style={{ backgroundColor: "var(--color-acid)" }}
                />
              )}
              {word}
            </span>
          ))}
        </p>

        <h1 className="mt-auto">
          <span className="sr-only">{hero.title}</span>
          <span aria-hidden="true" className="display-hero block">
            <span className="block">KOKORIN</span>
            <span
              className="block"
              style={{ marginLeft: "min(28vw, 22rem)", marginTop: "-0.06em" }}
            >
              WEB
            </span>
          </span>
        </h1>

        <div className="mt-10 grid gap-8 md:mt-14 md:grid-cols-[minmax(0,32rem)_auto] md:items-end md:gap-12">
          <div>
            <p className="lead" style={{ color: "var(--color-fg)" }}>
              {hero.lead}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {hero.actions.map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className={`btn ${action.primary ? "btn-primary" : "btn-ghost"}`}
                >
                  {action.label}
                  <Icon name={action.primary ? "arrow-up-right" : "arrow-right"} size={15} />
                </a>
              ))}
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-10 gap-y-6 md:justify-end">
            {hero.stats.map((stat) => (
              <li key={stat.label} className="min-w-[7rem]">
                <p className="flex items-baseline gap-1.5">
                  {"prefix" in stat && stat.prefix ? (
                    <span className="label !tracking-[0.14em]">{stat.prefix}</span>
                  ) : null}
                  <span
                    className="display-number text-[clamp(2.75rem,5.5vw,4.5rem)]"
                    style={{ color: "var(--color-acid)" }}
                  >
                    {stat.value}
                  </span>
                </p>
                <p className="label mt-2">{stat.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
