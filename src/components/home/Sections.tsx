import Link from "next/link";
import { DishCard } from "../DishCard";
import { DishMedia } from "../DishArt";
import { BrushDivider, Kicker, Section, SectionHeading } from "../Section";
import { Reveal } from "../ui";
import { ArrowRight, Calendar, Check, Clock, Phone, Pin, Star, Users } from "../Icons";
import { ABOUT, ADVANTAGES, CHEF, EVENTS, GALLERY, REVIEWS } from "@/lib/content";
import { CATEGORIES, featuredItems, formatPrice, setItems } from "@/lib/menu";
import { RESTAURANT } from "@/lib/restaurant";
import { ZONES } from "@/lib/booking";

/* ───────────────────────── 2. Популярные блюда ───────────────────────── */

export function Popular() {
  const items = featuredItems();
  return (
    <Section id="popular">
      <SectionHeading
        kicker="Берут чаще всего"
        title="Популярные блюда"
        jp="人気"
        lead="Шесть позиций, которые уходят каждый вечер. Если пришли впервые — начните отсюда."
        action={
          <Reveal delay={80}>
            <Link
              href="/menu"
              className="group flex items-center gap-2 text-[0.9375rem] font-semibold text-shu"
            >
              Смотреть всё меню
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        }
      />

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <Reveal as="li" key={item.id} delay={index * 60} className="h-full">
            <DishCard item={item} featured />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

/* ───────────────── 3–4. Разделы меню и как устроен заказ ───────────────── */

export function MenuTeaser() {
  return (
    <Section id="menu">
      <SectionHeading
        kicker="10 разделов, 47 позиций"
        title="Меню"
        jp="お品書き"
        lead="Фильтры по острым, вегетарианским, с лососем, с тунцом, запечённым и новинкам — чтобы не листать всё подряд."
      />

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORIES.map((category, index) => (
          <Reveal as="li" key={category.id} delay={index * 40} className="h-full">
            <Link
              href={`/menu?category=${category.id}`}
              className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-ink-2 p-5 transition-colors hover:border-shu"
            >
              <span className="jp text-2xl text-text-faint transition-colors group-hover:text-shu">
                {category.jp}
              </span>
              <span className="mt-8 block">
                <span className="block text-lg font-semibold text-text">{category.title}</span>
                <span className="mt-1 block text-sm text-text-faint">{category.subtitle}</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

const STEPS = [
  {
    title: "Собираете корзину",
    text: "Добавляете блюда прямо из меню. Цены и суммы считает сервер, а не браузер, — итог в корзине точный.",
  },
  {
    title: "Выбираете, как получить",
    text: "Забрать с собой — скидка 10% и готово через 30 минут. Или подать к вашему забронированному столику.",
  },
  {
    title: "Приходите к готовому",
    text: "Указываете время подачи: сели в 20:00 — роллы на столе в 20:05. Ждать сорок минут не придётся.",
  },
];

export function HowItWorks() {
  return (
    <Section id="order">
      <SectionHeading
        kicker="Онлайн-заказ"
        title={
          <>
            Заказ, который <span className="italic text-shu">ждёт вас</span>, а не наоборот
          </>
        }
        lead="Это главное отличие от обычного ресторанного сайта: блюда можно заказать заранее и привязать к брони."
      />

      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <Reveal as="li" key={step.title} delay={index * 90} className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-line bg-gradient-to-b from-ink-2 to-ink p-7">
              <span className="display text-5xl text-shu/30">0{index + 1}</span>
              <h3 className="mt-6 text-xl font-semibold text-text">{step.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-dim">{step.text}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

/* ───────────────────────── 5. Бронирование ───────────────────────── */

export function BookingTeaser() {
  return (
    <Section id="booking">
      <div className="grain relative overflow-hidden rounded-3xl border border-line bg-ink-2">
        <div className="wash absolute inset-0" aria-hidden="true" />
        <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <Kicker>Бронирование</Kicker>
            <h2 className="display mt-5 text-[clamp(2rem,5vw,3.5rem)]">
              Ваш стол
              <span className="block italic text-shu">уже ждёт</span>
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-text-dim">
              Выбираете дату, время и число гостей — а дальше сами тычете в свободный стол на схеме
              зала. Никаких «мы вам перезвоним»: занятое время видно сразу.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Calendar, text: "Запись на 30 дней вперёд" },
                { icon: Clock, text: "Шаг 30 минут, стол держим 2 часа" },
                { icon: Users, text: "От 1 до 12 гостей" },
                { icon: Check, text: "Бесплатно и без предоплаты" },
              ].map((row) => (
                <li key={row.text} className="flex items-center gap-3 text-[0.9375rem] text-text-dim">
                  <row.icon className="h-4.5 w-4.5 shrink-0 text-shu" />
                  {row.text}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/booking"
                className="group flex items-center gap-2.5 rounded-full bg-shu px-8 py-4 font-semibold text-ink transition-colors hover:bg-shu-soft"
              >
                Выбрать стол на схеме
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href={`tel:${RESTAURANT.phoneHref}`}
                className="flex items-center gap-2.5 rounded-full border border-line-strong px-8 py-4 font-semibold text-text transition-colors hover:border-shu hover:text-shu"
              >
                <Phone className="h-4.5 w-4.5" />
                {RESTAURANT.phone}
              </a>
            </div>
          </div>

          <ul className="grid gap-3">
            {ZONES.map((zone, index) => (
              <Reveal as="li" key={zone.id} delay={index * 60}>
                <div className="flex items-start gap-4 rounded-2xl border border-line bg-ink/60 p-5">
                  <span className="jp mt-0.5 shrink-0 text-lg text-shu">{zone.jp}</span>
                  <span>
                    <span className="block font-semibold text-text">
                      {zone.title}
                      {zone.surcharge ? (
                        <span className="ml-2 text-xs font-normal text-text-faint">
                          депозит {formatPrice(zone.surcharge)}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-text-dim">
                      {zone.description}
                    </span>
                  </span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ───────────────────────── 7. Сеты ───────────────────────── */

export function Sets() {
  const sets = setItems();
  return (
    <Section id="sets">
      <SectionHeading
        kicker="Когда выбирать некогда"
        title="Сеты"
        jp="セット"
        lead="Собраны так, чтобы в наборе не было двух похожих роллов. Считать порции на компанию не придётся."
      />

      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        {sets.map((set, index) => (
          <Reveal as="li" key={set.id} delay={index * 70} className="h-full">
            <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-ink-2 transition-colors hover:border-line-strong sm:flex-row">
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gradient-to-br from-ink-3 to-ink sm:aspect-auto sm:w-48">
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                  <DishMedia item={set} sizes="200px" />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="display text-2xl leading-tight">{set.name}</h3>
                  <span className="tnum shrink-0 text-lg font-bold text-shu">
                    {formatPrice(set.price)}
                  </span>
                </div>
                <p className="label mt-2 text-text-faint">
                  {set.setMeta?.pieces} шт · {set.weight} · {set.setMeta?.serves}
                </p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-text-dim">
                  {set.setMeta?.contents.map((row) => (
                    <li key={row} className="flex gap-2">
                      <span className="text-shu">·</span>
                      {row}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/menu?category=sets`}
                  className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-white/6 font-semibold text-text transition-colors hover:bg-shu hover:text-ink"
                >
                  Заказать
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

/* ───────────────────────── 8. Почему НОРИ ───────────────────────── */

export function Advantages() {
  return (
    <div className="bg-washi text-sumi">
      <BrushDivider flip />
      <Section id="why" className="!pt-4">
        <SectionHeading
          kicker="Без «лучших поваров города»"
          title="Почему НОРИ"
          jp="理由"
          tone="light"
        />

        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {ADVANTAGES.map((row, index) => (
            <Reveal as="li" key={row.kicker} delay={index * 70}>
              <p className="label text-shu-deep">{row.kicker}</p>
              <h3 className="display mt-4 text-2xl text-sumi">{row.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-sumi-soft">{row.text}</p>
            </Reveal>
          ))}
        </ul>
      </Section>
      <div className="text-ink">
        <BrushDivider />
      </div>
    </div>
  );
}

/* ───────────────────────── 9. О ресторане ───────────────────────── */

export function About() {
  return (
    <Section id="about">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-ink-3 via-ink-2 to-ink">
            <div className="wash absolute inset-0" />
            <span
              className="jp absolute inset-0 grid place-items-center text-[8rem] leading-none text-white/6"
              aria-hidden="true"
            >
              海苔
            </span>
            <div className="absolute inset-x-0 bottom-0 p-7">
              <p className="label text-shu">{RESTAURANT.since}</p>
              <p className="mt-2 text-lg font-semibold text-text">Малая Бронная, 18</p>
            </div>
          </div>
        </Reveal>

        <div>
          <SectionHeading kicker="О ресторане" title={ABOUT.title} jp="私たちについて" />
          <div className="mt-6 space-y-4">
            {ABOUT.paragraphs.map((paragraph, index) => (
              <Reveal key={index} delay={index * 60}>
                <p className="text-[1.0625rem] leading-relaxed text-text-dim">{paragraph}</p>
              </Reveal>
            ))}
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-line pt-8 sm:grid-cols-4">
            {ABOUT.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="display tnum text-3xl text-shu">{fact.value}</dt>
                <dd className="mt-1.5 text-sm text-text-faint">{fact.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}

/* ───────────────────────── 10. Шеф-повар ───────────────────────── */

export function Chef() {
  return (
    <Section id="chef">
      <div className="grid gap-10 rounded-3xl border border-line bg-ink-2 p-8 sm:p-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <Reveal>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[320px] overflow-hidden rounded-2xl bg-gradient-to-b from-ink-3 to-ink">
            {/* Портрета нет — рисуем силуэт в фирменной графике, а не серый прямоугольник. */}
            <svg viewBox="0 0 300 400" className="h-full w-full" aria-hidden="true">
              <circle cx="150" cy="140" r="66" fill="rgba(255,255,255,0.07)" />
              <path d="M40 400 q0 -130 110 -130 t110 130 z" fill="rgba(255,255,255,0.05)" />
              <path d="M84 118 q66 -40 132 0 l0 -12 q-66 -34 -132 0 z" fill="var(--color-shu)" opacity="0.8" />
              <rect x="118" y="272" width="64" height="128" fill="rgba(255,255,255,0.04)" />
            </svg>
            <span className="label absolute bottom-5 left-5 rounded-full bg-ink/85 px-3 py-2 text-text-dim backdrop-blur-sm">
              {CHEF.years} лет на кухне
            </span>
          </div>
        </Reveal>

        <div>
          <Kicker>Шеф-повар</Kicker>
          <h2 className="display mt-5 text-[clamp(2rem,4.5vw,3.25rem)]">{CHEF.name}</h2>
          <p className="mt-2 text-text-faint">{CHEF.role}</p>

          <div className="mt-6 space-y-4">
            {CHEF.bio.map((paragraph, index) => (
              <p key={index} className="leading-relaxed text-text-dim">
                {paragraph}
              </p>
            ))}
          </div>

          <p className="label mt-8 text-text-faint">Фирменные блюда</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {CHEF.signature.map((dish) => (
              <li
                key={dish}
                className="rounded-full border border-line px-4 py-2 text-sm text-text"
              >
                {dish}
              </li>
            ))}
          </ul>

          <Link
            href="/menu"
            className="group mt-8 inline-flex items-center gap-2.5 rounded-full bg-shu px-7 py-3.5 font-semibold text-ink transition-colors hover:bg-shu-soft"
          >
            Попробовать блюда шефа
            <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ───────────────────────── 11. Интерьер ───────────────────────── */

const TONE_CLASS: Record<string, string> = {
  warm: "from-[#2a1c14] to-[#120c09]",
  ink: "from-[#14161c] to-[#0a0a0c]",
  light: "from-[#2b2721] to-[#131110]",
  ember: "from-[#2e150c] to-[#120806]",
};

export function Interior() {
  return (
    <Section id="interior" width="full">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          kicker="Интерьер"
          title="Как у нас внутри"
          jp="店内"
          lead="Дерево, бетон и тёплый свет. Прокрутите вбок."
        />
      </div>

      <div className="rail mt-10 flex gap-4 overflow-x-auto px-1 pb-4">
        {GALLERY.map((frame, index) => (
          <Reveal key={frame.id} delay={index * 50}>
            <figure
              className={`relative h-[320px] w-[260px] shrink-0 overflow-hidden rounded-2xl border border-line bg-gradient-to-br sm:h-[400px] sm:w-[330px] ${
                TONE_CLASS[frame.tone] ?? TONE_CLASS.ink
              }`}
            >
              <span
                className="jp absolute inset-0 grid place-items-center text-[4.5rem] text-white/8"
                aria-hidden="true"
              >
                {frame.jp}
              </span>
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent p-5">
                <span className="label text-shu">{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-1.5 block text-lg font-semibold text-text">{frame.title}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── 12. Акции и события ───────────────────────── */

export function Events() {
  return (
    <Section id="events">
      <SectionHeading
        kicker="Что происходит"
        title="Акции и события"
        jp="催し"
        lead="Без мелкого шрифта: условия описаны целиком прямо здесь."
      />

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {EVENTS.map((event, index) => (
          <Reveal as="li" key={event.id} delay={index * 60} className="h-full">
            <article className="group flex h-full gap-5 rounded-2xl border border-line bg-ink-2 p-6 transition-colors hover:border-shu">
              <span className="label grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-shu/12 text-center text-[0.625rem] leading-tight text-shu">
                {event.badge}
              </span>
              <div>
                <h3 className="text-xl font-semibold text-text">{event.title}</h3>
                <p className="label mt-1.5 text-text-faint">{event.when}</p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-dim">{event.text}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </ul>

      <Reveal delay={120}>
        <Link
          href="/booking"
          className="group mt-8 inline-flex items-center gap-2.5 rounded-full border border-line-strong px-7 py-3.5 font-semibold text-text transition-colors hover:border-shu hover:text-shu"
        >
          Забронировать на событие
          <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </Section>
  );
}

/* ───────────────────────── 13. Отзывы ───────────────────────── */

export function Reviews() {
  return (
    <div className="bg-washi text-sumi">
      <BrushDivider flip />
      <Section id="reviews" className="!pt-4">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading kicker="Отзывы" title="Что о нас пишут" jp="口コミ" tone="light" />
          <Reveal delay={80}>
            <div className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white/60 px-6 py-4">
              <span className="display tnum text-5xl text-sumi">{RESTAURANT.rating.score}</span>
              <div>
                <div className="flex gap-0.5 text-gold">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} className="h-4 w-4" />
                  ))}
                </div>
                <p className="mt-1 text-sm text-sumi-soft">
                  {RESTAURANT.rating.count} оценок · {RESTAURANT.rating.sources.join(", ")}
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {REVIEWS.map((review, index) => (
            <Reveal as="li" key={review.author} delay={index * 60} className="h-full">
              <figure className="flex h-full flex-col rounded-2xl border border-black/10 bg-white/70 p-7">
                <div className="flex gap-0.5 text-gold">
                  {Array.from({ length: review.score }, (_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[1.0625rem] leading-relaxed text-sumi">
                  «{review.text}»
                </blockquote>
                <figcaption className="mt-5 text-sm text-sumi-soft">
                  <span className="font-semibold text-sumi">{review.author}</span> · {review.source}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </Section>
      <div className="text-ink">
        <BrushDivider />
      </div>
    </div>
  );
}

/* ───────────────────────── 15. Контакты ───────────────────────── */

export function Contacts() {
  return (
    <Section id="contacts">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <SectionHeading kicker="Контакты" title={RESTAURANT.name} jp="連絡先" />

          <dl className="mt-8 space-y-6">
            <ContactRow icon={<Pin className="h-4.5 w-4.5" />} term="Адрес">
              {RESTAURANT.address}
              <span className="mt-1 block text-text-faint">{RESTAURANT.metro}</span>
            </ContactRow>
            <ContactRow icon={<Phone className="h-4.5 w-4.5" />} term="Телефон">
              <a href={`tel:${RESTAURANT.phoneHref}`} className="transition-colors hover:text-shu">
                {RESTAURANT.phone}
              </a>
              <a
                href={`mailto:${RESTAURANT.email}`}
                className="mt-1 block text-text-faint transition-colors hover:text-shu"
              >
                {RESTAURANT.email}
              </a>
            </ContactRow>
            <ContactRow icon={<Clock className="h-4.5 w-4.5" />} term="Часы работы">
              <ul className="space-y-1">
                {RESTAURANT.hours.map((row) => (
                  <li key={row.days} className="flex justify-between gap-6 sm:max-w-[260px]">
                    <span>{row.days}</span>
                    <span className="tnum text-text-dim">{row.time}</span>
                  </li>
                ))}
              </ul>
            </ContactRow>
          </dl>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href={RESTAURANT.mapRoute}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full bg-shu px-7 py-3.5 font-semibold text-ink transition-colors hover:bg-shu-soft"
            >
              Построить маршрут
            </a>
            <Link
              href="/booking"
              className="rounded-full border border-line-strong px-7 py-3.5 font-semibold text-text transition-colors hover:border-shu hover:text-shu"
            >
              Забронировать стол
            </Link>
          </div>
        </div>

        {/* Схематичная карта: настоящая подключается одним <iframe> с ключом Яндекса. */}
        <Reveal delay={80}>
          <div className="relative h-full min-h-[380px] overflow-hidden rounded-3xl border border-line bg-ink-2">
            <svg viewBox="0 0 400 320" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <rect width="400" height="320" fill="#101014" />
              {[60, 130, 200, 270].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              ))}
              {[70, 160, 250, 340].map((x) => (
                <line key={x} x1={x} y1="0" x2={x} y2="320" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              ))}
              <path d="M0 200 q120 -40 200 -10 t200 -30" stroke="rgba(78,158,122,0.35)" strokeWidth="16" fill="none" />
              <circle cx="160" cy="130" r="34" fill="rgba(255,90,43,0.16)" />
              <circle cx="160" cy="130" r="9" fill="var(--color-shu)" />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-t from-ink to-transparent p-6">
              <div>
                <p className="label text-shu">Мы здесь</p>
                <p className="mt-1.5 font-semibold text-text">{RESTAURANT.address}</p>
              </div>
              <a
                href={RESTAURANT.mapRoute}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:border-shu hover:text-shu"
              >
                Открыть карту
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function ContactRow({
  icon,
  term,
  children,
}: {
  icon: React.ReactNode;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 text-shu">{icon}</span>
      <div>
        <dt className="label text-text-faint">{term}</dt>
        <dd className="mt-2 text-[1.0625rem] leading-relaxed text-text">{children}</dd>
      </div>
    </div>
  );
}

/* ───────────────────────── 16. Финальный CTA ───────────────────────── */

export function FinalCta() {
  return (
    <section className="grain relative overflow-hidden border-t border-line">
      <div className="wash absolute inset-0" aria-hidden="true" />
      <span
        className="jp absolute -bottom-10 right-4 text-[12rem] leading-none text-white/4 sm:text-[18rem]"
        aria-hidden="true"
      >
        海苔
      </span>

      <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-32">
        <Reveal>
          <Kicker>До встречи</Kicker>
        </Reveal>
        <Reveal delay={70}>
          <h2 className="display mt-6 text-[clamp(2.5rem,7vw,4.5rem)]">
            Увидимся в <span className="italic text-shu">НОРИ</span>
          </h2>
        </Reveal>
        <Reveal delay={130}>
          <p className="mx-auto mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-text-dim">
            Забронируйте стол или выберите блюда заранее — остальное мы подготовим к вашему приходу.
          </p>
        </Reveal>
        <Reveal delay={190}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/booking"
              className="rounded-full bg-shu px-8 py-4 font-semibold text-ink transition-colors hover:bg-shu-soft"
            >
              Забронировать стол
            </Link>
            <Link
              href="/menu"
              className="rounded-full border border-line-strong px-8 py-4 font-semibold text-text transition-colors hover:border-shu hover:text-shu"
            >
              Открыть меню
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
