import type { Metadata } from "next";
import { Section } from "@/components/Section";
import { RESTAURANT } from "@/lib/restaurant";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Какие данные собирает сайт НОРИ и зачем.",
};

const BLOCKS = [
  {
    title: "Какие данные мы собираем",
    text: `Имя, телефон и комментарий — только те, что вы сами вводите в форме брони, заказа или заявки на сертификат. Ничего больше сайт о вас не спрашивает.`,
  },
  {
    title: "Зачем",
    text: "Чтобы придержать за вами стол, приготовить заказ ко времени и позвонить, если что-то изменится. Для рекламных рассылок эти данные не используются.",
  },
  {
    title: "Кому передаём",
    text: "Никому за пределами ресторана. Заявки уходят в рабочий чат хостес и на кухню.",
  },
  {
    title: "Сколько храним",
    text: "Данные брони — до конца текущего сезона, после чего удаляются. Отменить бронь и попросить удалить данные можно по телефону.",
  },
  {
    title: "Файлы cookie",
    text: "Корзина и последняя бронь хранятся в localStorage вашего браузера и на наши серверы не уходят. Внешних рекламных трекеров на сайте нет.",
  },
];

export default function PrivacyPage() {
  return (
    <Section width="narrow">
      <h1 className="display text-[clamp(2rem,5vw,3.25rem)]">Политика конфиденциальности</h1>
      <p className="mt-4 text-text-dim">
        Коротко и без юридического тумана. Вопросы — {RESTAURANT.phone}, {RESTAURANT.email}.
      </p>

      <div className="mt-12 space-y-10">
        {BLOCKS.map((block) => (
          <section key={block.title}>
            <h2 className="display text-2xl text-text">{block.title}</h2>
            <p className="mt-3 leading-relaxed text-text-dim">{block.text}</p>
          </section>
        ))}
      </div>
    </Section>
  );
}
