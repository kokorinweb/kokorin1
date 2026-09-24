import { CATEGORIES } from "@/lib/catalog";
import { whatsappUrl } from "@/lib/company";
import { CategoryArt } from "./Art";
import { Photo } from "./Photo";
import { ArrowIcon } from "./Icons";

/**
 * На широком экране — сетка карточек с крупной картинкой.
 *
 * На телефоне так листать невыносимо: пять карточек с иллюстрацией во всю
 * ширину — это почти четыре экрана до следующего блока. Поэтому крупной
 * остаётся только первая карточка (она держит внимание), а остальные
 * сворачиваются в строки с миниатюрой. Начиная с sm всё возвращается в сетку.
 */
export function Catalog() {
  return (
    <section id="catalog" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:py-28">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-walnut">Каталог</p>
        <h2 className="display mt-3 text-4xl leading-tight sm:text-5xl">
          Выберите, какая мебель вам нужна
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft text-pretty">
          Каждое направление считается по своим вводным. Выберите ближайшее — и напишите, что
          у вас за помещение.
        </p>
      </header>

      <ul className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {CATEGORIES.map((category) => {
          const compact = !category.feature;

          return (
            <li key={category.id} className={category.feature ? "sm:col-span-2" : undefined}>
              <a
                href={whatsappUrl(
                  `Здравствуйте! Пишу с сайта. Интересует направление «${category.title}».`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex h-full overflow-hidden rounded-3xl border border-line bg-surface transition-colors duration-200 hover:border-walnut/45 ${
                  compact
                    ? "flex-row items-center gap-4 p-3 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0"
                    : "flex-col"
                }`}
              >
                <Photo
                  name={category.id}
                  alt={category.title}
                  className={
                    compact
                      ? "aspect-square w-24 shrink-0 rounded-2xl bg-sand-deep sm:aspect-[4/3] sm:w-full sm:rounded-none"
                      : "aspect-[16/10] bg-sand-deep sm:aspect-[16/9]"
                  }
                >
                  <CategoryArt id={category.id} className="h-full w-full" />
                </Photo>

                <div
                  className={
                    compact
                      ? "flex min-w-0 flex-1 items-center gap-3 sm:block sm:p-6"
                      : "flex flex-1 flex-col p-5 sm:p-6"
                  }
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="display text-xl sm:text-2xl">{category.title}</h3>
                    <p
                      className={`mt-1.5 leading-relaxed text-ink-soft text-pretty sm:mt-2.5 ${
                        compact ? "line-clamp-2 text-sm sm:line-clamp-none sm:text-base" : ""
                      }`}
                    >
                      {category.blurb}
                    </p>
                  </div>

                  {/* На узком экране вся строка — ссылка, поэтому хватает стрелки. */}
                  <ArrowIcon
                    className={`h-5 w-5 shrink-0 text-walnut ${compact ? "sm:hidden" : "hidden"}`}
                  />
                  <span
                    className={`mt-5 items-center gap-2 text-sm font-semibold text-walnut ${
                      compact ? "hidden sm:inline-flex" : "inline-flex"
                    }`}
                  >
                    Обсудить
                    <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
