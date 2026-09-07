import Link from "next/link";
import { DishArt } from "../DishArt";
import { Reveal } from "../ui";
import { ArrowRight, Clock, Pin, Star } from "../Icons";
import { RESTAURANT, hoursForDay } from "@/lib/restaurant";
import { getMenuItem } from "@/lib/menu";
import { moscowNow } from "@/lib/booking";

export function Hero() {
  const today = hoursForDay(moscowNow().getDay());
  const hero = getMenuItem("nori-special");

  return (
    <section className="grain relative overflow-hidden">
      <div className="wash absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div>
          <Reveal>
            <p className="label flex flex-wrap items-center gap-x-4 gap-y-2 text-text-dim">
              <span className="flex items-center gap-1.5 text-gold">
                <Star className="h-3.5 w-3.5" />
                <span className="tnum">{RESTAURANT.rating.score}</span>
                <span className="text-text-faint">/ 5</span>
              </span>
              <span className="text-text-faint">
                {RESTAURANT.rating.count} отзывов · с {RESTAURANT.since} года
              </span>
            </p>
          </Reveal>

          <Reveal delay={70}>
            <h1 className="display mt-6 text-[clamp(2.75rem,8vw,5.5rem)]">
              {RESTAURANT.name}
              <span className="jp ml-4 align-super text-[0.22em] tracking-[0.3em] text-shu">
                {RESTAURANT.kanji}
              </span>
              <span className="mt-2 block italic text-text-dim">японская кухня</span>
              <span className="block">в центре города</span>
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <p className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-text-dim">
              Охлаждённая рыба приезжает в шесть утра, рис варится весь день, роллы собирают после
              того, как вы заказали. Никакой витрины с нарезанным заранее — и никакого пафоса.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className="group flex cursor-pointer items-center gap-2.5 rounded-full bg-shu px-8 py-4 font-semibold text-ink transition-colors hover:bg-shu-soft"
              >
                Посмотреть меню
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/booking"
                className="cursor-pointer rounded-full border border-line-strong px-8 py-4 font-semibold text-text transition-colors hover:border-shu hover:text-shu"
              >
                Забронировать стол
              </Link>
            </div>
          </Reveal>

          <Reveal delay={260}>
            <dl className="mt-12 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
              <Fact icon={<Clock className="h-4 w-4" />} term="Сегодня">
                {today.time}
              </Fact>
              <Fact icon={<Pin className="h-4 w-4" />} term="Адрес">
                {RESTAURANT.address.replace("Москва, ", "")}
                <span className="mt-0.5 block text-text-faint">{RESTAURANT.metro}</span>
              </Fact>
              <Fact icon={<Star className="h-4 w-4" />} term="Рейтинг">
                {RESTAURANT.rating.score} на Яндекс Картах
                <span className="mt-0.5 block text-text-faint">и 2ГИС</span>
              </Fact>
            </dl>
          </Reveal>
        </div>

        {/* Композиция справа: тушевой круг эннсо, блюдо и вертикальный кандзи. */}
        <Reveal delay={120} className="relative mx-auto w-full max-w-[520px]">
          <div className="relative aspect-square">
            <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <defs>
                <linearGradient id="enso" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-shu)" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="var(--color-shu)" stopOpacity="0.08" />
                </linearGradient>
              </defs>
              <circle cx="200" cy="200" r="185" fill="rgba(255,255,255,0.02)" />
              <path
                d="M200 24 a176 176 0 1 1 -124 300"
                fill="none"
                stroke="url(#enso)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <circle
                cx="200"
                cy="200"
                r="150"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="2 10"
              />
            </svg>

            {hero ? (
              <DishArt
                art={hero.art}
                seed="hero"
                className="drift absolute inset-[13%] h-[74%] w-[74%]"
              />
            ) : null}

            <span
              className="jp absolute -right-1 top-6 text-[2.75rem] leading-[1.15] tracking-widest text-white/8 [writing-mode:vertical-rl] sm:text-[3.5rem]"
              aria-hidden="true"
            >
              寿司と刺身
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-ink-2/70 p-5 backdrop-blur-sm">
            <p className="label text-shu">Блюдо шефа</p>
            <p className="display mt-2 text-2xl">Нори Special</p>
            <p className="mt-2 text-sm text-text-dim">
              Лосось, гребешок и трюфельный понзу. 8 штук, 280 г — 1 290 ₽.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Fact({
  icon,
  term,
  children,
}: {
  icon: React.ReactNode;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="label flex items-center gap-2 text-text-faint">
        <span className="text-shu">{icon}</span>
        {term}
      </dt>
      <dd className="mt-2.5 text-[0.9375rem] leading-relaxed text-text">{children}</dd>
    </div>
  );
}
