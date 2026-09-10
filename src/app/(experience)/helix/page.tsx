import type { CSSProperties } from "react";
import { Counter } from "@/components/helix/Counter";
import { HelixScroll } from "@/components/helix/HelixScroll";

/** Задержка каскада. Кастомные свойства в style приходится приводить руками. */
const delay = (seconds: number) => ({ "--reveal-delay": `${seconds}s` }) as CSSProperties;

const MANIFEST = [
  { text: "Ваш геном", accent: false },
  { text: "не меняется с возрастом.", accent: false },
  { text: "Меняется только то,", accent: false },
  { text: "что мы умеем в нём прочитать.", accent: true },
];

const STATS = [
  { to: 3.2, decimals: 1, unit: " млрд", label: "пар оснований в одном прогоне" },
  { to: 30, decimals: 0, unit: "×", label: "среднее покрытие последовательности" },
  { to: 6, decimals: 0, unit: " ч", label: "от пробирки до клинического отчёта" },
  { to: 14000, decimals: 0, unit: "", label: "маркеров с доказанной значимостью" },
];

const STEPS = [
  {
    title: "Забор материала",
    body: "Четыре миллилитра венозной крови. Курьер приезжает к вам или вы заходите в любую из партнёрских лабораторий в 47 городах.",
  },
  {
    title: "Секвенирование",
    body: "NovaSeq X, покрытие 30×. Сырые данные не покидают контур лаборатории и не уезжают ни в какое облако.",
  },
  {
    title: "Разбор с генетиком",
    body: "Находки объясняет живой врач на часовой консультации. PDF с таблицей вариантов без интерпретации — это не результат.",
  },
];

const PANELS = [
  {
    tag: "Онкориски",
    title: "84 гена",
    body: "BRCA1, BRCA2, синдром Линча и другие панели с подтверждённой клинической значимостью.",
  },
  {
    tag: "Фармакогенетика",
    title: "230 препаратов",
    body: "Как именно ваш организм метаболизирует антикоагулянты, антидепрессанты и анестетики.",
  },
  {
    tag: "Носительство",
    title: "1 300 состояний",
    body: "Рецессивные заболевания, которые имеет смысл проверить до планирования ребёнка.",
  },
  {
    tag: "Кардиология",
    title: "Наследуемое",
    body: "Кардиомиопатии и аритмогенные синдромы, которые годами идут без единого симптома.",
  },
  {
    tag: "Метаболизм",
    title: "Обмен веществ",
    body: "Лактоза, глютен, обмен железа, витамин D, фолатный цикл — с поправкой на реальные данные.",
  },
  {
    tag: "Ваши данные",
    title: "FASTQ и VCF",
    body: "Сырые файлы остаются вашими: выгрузка в любой момент, удаление — по одному запросу.",
  },
];

const TICKER = ["Аденин", "Тимин", "Гуанин", "Цитозин", "A · T · G · C"];

export default function HelixPage() {
  return (
    <>
      <HelixScroll />

      <div className="hx-shell">
        <section className="hx-section">
          <div className="hx-inner hx-manifest">
            {MANIFEST.map((line, index) => (
              <span key={line.text} className="hx-manifest__line" data-reveal-mask>
                <span data-reveal="line" style={delay(index * 0.09)}>
                  {line.accent ? <em>{line.text}</em> : line.text}
                </span>
              </span>
            ))}
          </div>
        </section>

        <section className="hx-section">
          <div className="hx-inner">
            <p className="hx-eyebrow" data-reveal="fade">
              Что стоит за отчётом
            </p>
            <h2 className="hx-h2" data-reveal style={delay(0.06)}>
              Цифры, которые можно проверить
            </h2>

            <div className="hx-stats">
              {STATS.map((stat, index) => (
                <div key={stat.label} data-reveal style={delay(index * 0.08)}>
                  <Counter to={stat.to} decimals={stat.decimals} unit={stat.unit} />
                  <p className="hx-stat__label">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hx-section">
          <div className="hx-inner">
            <p className="hx-eyebrow" data-reveal="fade">
              Как это устроено
            </p>
            <h2 className="hx-h2" data-reveal style={delay(0.06)}>
              Три шага и ни одного лишнего
            </h2>

            <div className="hx-steps">
              {STEPS.map((step, index) => (
                <article key={step.title} className="hx-step" data-reveal style={delay(index * 0.1)}>
                  <div className="hx-step__spine" aria-hidden />
                  <div className="hx-step__index" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="hx-step__title">{step.title}</h3>
                  <p className="hx-step__body">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Дублируем список: лента уезжает ровно на половину ширины и склеивается без шва. */}
        <div className="hx-marquee" aria-hidden>
          <div className="hx-marquee__row">
            {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((word, index) => (
              <span key={`a-${index}`}>{word}</span>
            ))}
          </div>
        </div>
        <div className="hx-marquee" aria-hidden>
          <div className="hx-marquee__row" data-dir="reverse">
            {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((word, index) => (
              <span key={`b-${index}`}>{word}</span>
            ))}
          </div>
        </div>

        <section className="hx-section" style={{ paddingBottom: 0 }}>
          <div className="hx-inner">
            <p className="hx-eyebrow" data-reveal="fade">
              Панели
            </p>
            <h2 className="hx-h2" data-reveal style={delay(0.06)}>
              Один прогон — шесть направлений
            </h2>
          </div>
        </section>

        <div className="hx-rail">
          <div className="hx-rail__track">
            {PANELS.map((panel) => (
              <article key={panel.tag} className="hx-card">
                <p className="hx-card__tag">{panel.tag}</p>
                <h3 className="hx-card__title">{panel.title}</h3>
                <p className="hx-card__body">{panel.body}</p>
              </article>
            ))}
          </div>
        </div>

        <section className="hx-section">
          <div className="hx-inner">
            <h2 className="hx-h2" data-reveal="rise">
              Прочитать геном — один раз.
              <br />
              Пользоваться — всю жизнь.
            </h2>
            <p className="hx-lead" data-reveal style={delay(0.08)}>
              Запись на забор материала занимает минуту. Консультацию генетика можно перенести или
              отменить в любой момент — интерпретация остаётся доступной в личном кабинете.
            </p>
            <a className="hx-cta" href="#" data-reveal="scale" style={delay(0.14)}>
              Записаться на секвенирование
              <span aria-hidden>→</span>
            </a>
          </div>
        </section>

        <footer className="hx-footer">
          <span>© 2026 NUCLEA</span>
          <span>
            Демонстрация скролл-анимации. Компания и все медицинские цифры на странице вымышлены.{" "}
            <a href="/">Другой проект в этом репозитории →</a>
          </span>
        </footer>
      </div>
    </>
  );
}
