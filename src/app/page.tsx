import Link from "next/link";
import { DishCard } from "@/components/DishCard";
import { HeroScene } from "@/components/home/HeroScene";
import { ArrowRightIcon } from "@/components/icons";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { publicImage } from "@/lib/assets";
import { featuredItems } from "@/lib/menu";
import { RESTAURANT } from "@/lib/restaurant";

const STORY = [
  {
    title: "Печь на дровах",
    text: "Неаполитанская печь держит 450 °C, пицца готовится 90 секунд и получается с тем самым леопардовым бортом.",
  },
  {
    title: "Паста ручной работы",
    text: "Тальятелле, тонарелли и равиоли катаем каждое утро из семолины и яиц от фермеров.",
  },
  {
    title: "Продукты из Италии",
    text: "Томаты Сан-Марцано, пекорино романо, буррата из Апулии, оливковое масло с урожая этого года.",
  },
];

export default function HomePage() {
  const d = RESTAURANT.delivery;
  const featured = featuredItems();

  return (
    <>
      <HeroScene
        titleLines={["Кухня, ради которой", "едут через город"]}
        lead="Паста ручной работы, пицца на дровах и вино из небольших хозяйств. Доставляем за час или накрываем стол у себя."
        phone={RESTAURANT.phone}
        phoneHref={RESTAURANT.phoneHref}
        image={publicImage("hero.jpg")}
      />

      {/*
        Манифест наезжает на ещё приклеенный герой: перекрытие задано классом .overlap-hero.
        Своей анимации появления у него нет — приезд и есть его движение.
      */}
      <section
        data-dark
        className="overlap-hero relative z-10 rounded-t-[2rem] bg-basil text-on-basil shadow-[0_-40px_80px_-30px_rgba(22,31,24,0.6)] sm:rounded-t-[3rem]"
      >
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="display text-center text-[clamp(1.65rem,4.2vw,3.25rem)] leading-[1.32]">
            Мы катаем пасту <em>руками</em> каждое утро, держим печь на <em>450 °C</em> и возим
            продукты с итальянских ферм. Никакой высокой кухни. Просто <em>честная</em> остерия.
          </p>

          <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-relaxed text-on-basil-soft">
            Соберите заказ на сайте или спросите нашего ИИ-консультанта: он подберёт блюда под ваш
            вкус, бюджет и ограничения в еде.
          </p>

          <div className="mt-16 grid gap-8 border-t border-on-basil-soft/25 pt-10 sm:mt-20 md:grid-cols-3">
            {STORY.map((block) => (
              <div key={block.title}>
                <h2 className="display text-2xl">{block.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-on-basil-soft">{block.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <dl className="grid gap-6 sm:grid-cols-3">
          <Stat term="Доставка" value={`${d.etaMinutes} минут`} hint={d.zone} />
          <Stat
            term="Бесплатная доставка"
            value={`от ${d.freeFrom.toLocaleString("ru-RU")} ₽`}
            hint={`минимальный заказ ${d.minOrder.toLocaleString("ru-RU")} ₽`}
          />
          <Stat
            term="Самовывоз"
            value={`−${RESTAURANT.pickup.discountPercent}%`}
            hint={`готово через ${RESTAURANT.pickup.etaMinutes} минут`}
          />
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-4xl sm:text-5xl">Рекомендуем</h2>
            <p className="mt-2 text-ink-soft">Блюда, которые заказывают чаще всего</p>
          </div>
          <Link
            href="/menu"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-basil hover:underline"
          >
            Всё меню
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => (
            <StaggerItem key={item.id} className="h-full">
              <DishCard item={item} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-4 pt-16 sm:px-6">
        <div className="rounded-3xl bg-basil px-6 py-12 text-on-basil sm:px-12">
          <h2 className="display max-w-2xl text-4xl">Не знаете, что выбрать? Спросите Луку</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-on-basil-soft">
            Наш ИИ-консультант знает состав каждого блюда, аллергены и цены. Он соберёт ужин под
            бюджет и сам положит всё в корзину. Работает здесь на сайте, кнопка в правом нижнем
            углу, и в{" "}
            <a className="text-on-basil underline" href={RESTAURANT.telegram}>
              Telegram-боте
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}

function Stat({ term, value, hint }: { term: string; value: string; hint: string }) {
  return (
    <div className="border-t border-plaster-dark pt-5">
      <dt className="text-sm uppercase tracking-wider text-ink-soft">{term}</dt>
      <dd className="display mt-1 text-3xl text-terracotta">{value}</dd>
      <dd className="mt-1 text-sm text-ink-soft">{hint}</dd>
    </div>
  );
}
