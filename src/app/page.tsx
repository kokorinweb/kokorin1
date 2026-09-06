import Link from "next/link";
import { DishCard } from "@/components/DishCard";
import { featuredItems } from "@/lib/menu";
import { RESTAURANT } from "@/lib/restaurant";

const STORY = [
  {
    title: "Печь на дровах",
    text: "Неаполитанская печь держит 450 °C — пицца готовится 90 секунд и получается с тем самым леопардовым бортом.",
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
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <p className="text-sm uppercase tracking-[0.2em] text-terracotta">
          Москва · с 2014 года
        </p>
        <h1 className="display mt-4 max-w-3xl text-5xl leading-[1.05] sm:text-6xl">
          Итальянская кухня, как <span className="text-basil">у бабушки в Тоскане</span> — только
          с доставкой
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Паста ручной работы, пицца на дровах и вино из небольших хозяйств. Соберите заказ на сайте
          или спросите нашего ИИ-консультанта — он подберёт блюда под ваш вкус, бюджет и
          ограничения в еде.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/menu"
            className="rounded-full bg-basil px-7 py-3.5 font-semibold text-cream transition-colors hover:bg-basil-dark"
          >
            Смотреть меню
          </Link>
          <a
            href={`tel:${RESTAURANT.phoneHref}`}
            className="rounded-full border border-basil px-7 py-3.5 font-semibold text-basil transition-colors hover:bg-basil hover:text-cream"
          >
            Забронировать стол
          </a>
        </div>

        <dl className="mt-14 grid gap-6 border-t border-cream-dark pt-8 sm:grid-cols-3">
          <Stat term="Доставка" value={`${d.etaMinutes} минут`} hint={d.zone} />
          <Stat
            term="Бесплатная доставка"
            value={`от ${d.freeFrom.toLocaleString("ru-RU")} ₽`}
            hint={`минимальный заказ — ${d.minOrder.toLocaleString("ru-RU")} ₽`}
          />
          <Stat
            term="Самовывоз"
            value={`−${RESTAURANT.pickup.discountPercent}%`}
            hint={`готово через ${RESTAURANT.pickup.etaMinutes} минут`}
          />
        </dl>
      </section>

      <section className="border-y border-cream-dark bg-white/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
          {STORY.map((block) => (
            <div key={block.title}>
              <h2 className="display text-2xl text-basil">{block.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{block.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-4xl">Рекомендуем</h2>
            <p className="mt-2 text-ink-soft">Блюда, которые заказывают чаще всего</p>
          </div>
          <Link href="/menu" className="font-semibold text-basil hover:underline">
            Всё меню →
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => (
            <DishCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <div className="rounded-3xl bg-basil px-6 py-12 text-cream sm:px-12">
          <h2 className="display max-w-2xl text-4xl">
            Не знаете, что выбрать? Спросите Луку
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed opacity-90">
            Наш ИИ-консультант знает состав каждого блюда, аллергены и цены. Он соберёт ужин под
            бюджет и сам положит всё в корзину. Работает здесь на сайте — кнопка в правом нижнем
            углу — и в{" "}
            <a className="underline" href={RESTAURANT.telegram}>
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
    <div>
      <dt className="text-sm uppercase tracking-wider text-ink-soft">{term}</dt>
      <dd className="display mt-1 text-3xl text-terracotta">{value}</dd>
      <dd className="mt-1 text-sm text-ink-soft">{hint}</dd>
    </div>
  );
}
