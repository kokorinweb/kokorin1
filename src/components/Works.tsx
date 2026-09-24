import { whatsappUrl } from "@/lib/company";
import { CategoryArt } from "./Art";
import { Photo } from "./Photo";

/**
 * Витрина типов работ. Это не «наши объекты»: снимков компании в открытых
 * источниках нет, и выдавать иллюстрации за выполненные заказы мы не будем.
 * Подписи честно называют тип работы. Появятся настоящие фотографии — файлы
 * /photos/work-1.jpg … work-6.jpg встанут на место иллюстраций сами.
 *
 * На телефоне шесть карточек столбиком — три с лишним экрана пролистывания,
 * поэтому там это лента с прокруткой вбок: следующая карточка выглядывает из-за
 * края и показывает, что ряд продолжается. С sm снова обычная сетка.
 */
const WORKS = [
  { file: "work-1", art: "kitchens", title: "Кухня под потолок", note: "Верхний ряд до плиты перекрытия" },
  { file: "work-2", art: "wardrobes", title: "Шкаф в нишу", note: "По факту стен, без щелей по бокам" },
  { file: "work-3", art: "glass", title: "Стеклянная перегородка", note: "Зонирование без потери света" },
  { file: "work-4", art: "cabinet", title: "Стеллаж и рабочее место", note: "Под конкретную стену и технику" },
  { file: "work-5", art: "panels", title: "Реечная стена", note: "В цвет и фактуру остальной мебели" },
  { file: "work-6", art: "wardrobes", title: "Гардеробная комната", note: "Наполнение под ваш гардероб" },
];

export function Works() {
  return (
    <section id="works" className="border-y border-line bg-sand-deep">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:py-28">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-walnut">Что делаем</p>
          <h2 className="display mt-3 text-4xl leading-tight sm:text-5xl">
            Задачи, с которыми к нам приходят чаще всего
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft text-pretty">
            Готовая мебель почти никогда не встаёт в реальную квартиру: мешает скос потолка,
            труба в углу или лишние четыре сантиметра. Здесь как раз начинается заказная.
          </p>
          <p className="mt-4 text-sm text-ink-soft sm:hidden">Листайте вбок →</p>
        </header>

        <ul
          className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
          style={{ overscrollBehaviorX: "contain" }}
        >
          {WORKS.map((work) => (
            <li key={work.file} className="w-[72%] shrink-0 snap-start sm:w-auto sm:shrink">
              <a
                href={whatsappUrl(`Здравствуйте! Пишу с сайта. Интересует: ${work.title.toLowerCase()}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full overflow-hidden rounded-3xl border border-line bg-surface transition-colors duration-200 hover:border-walnut/45"
              >
                <Photo name={work.file} alt={work.title} className="aspect-[4/3] bg-sand">
                  <CategoryArt id={work.art} className="h-full w-full" />
                </Photo>
                <div className="p-4 sm:p-5">
                  <h3 className="font-semibold">{work.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft text-pretty">
                    {work.note}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
