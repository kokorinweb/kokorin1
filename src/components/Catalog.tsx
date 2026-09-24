import { CATEGORIES } from "@/lib/catalog";
import { whatsappUrl } from "@/lib/company";
import { CategoryArt } from "./Art";
import { Photo } from "./Photo";
import { ArrowIcon } from "./Icons";

export function Catalog() {
  return (
    <section id="catalog" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
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

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <li
            key={category.id}
            className={category.feature ? "sm:col-span-2 lg:col-span-2" : undefined}
          >
            <a
              href={whatsappUrl(
                `Здравствуйте! Пишу с сайта. Интересует направление «${category.title}».`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-colors duration-200 hover:border-walnut/45"
            >
              <Photo
                name={category.id}
                alt={category.title}
                className={`bg-sand-deep ${category.feature ? "aspect-[16/9]" : "aspect-[4/3]"}`}
              >
                <CategoryArt id={category.id} className="h-full w-full" />
              </Photo>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="display text-2xl">{category.title}</h3>
                <p className="mt-2.5 flex-1 leading-relaxed text-ink-soft text-pretty">
                  {category.blurb}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-walnut">
                  Обсудить
                  <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
