import type { Metadata } from "next";
import { BookingWizard } from "@/components/BookingWizard";
import { Section, SectionHeading } from "@/components/Section";

export const metadata: Metadata = {
  title: "Бронирование столика",
  description:
    "Забронируйте стол в НОРИ: выберите дату, время, число гостей и конкретный столик на схеме зала. Бесплатно и без предоплаты.",
};

/** Схема зала зависит от текущего времени — статикой её отдавать нельзя. */
export const dynamic = "force-dynamic";

export default function BookingPage() {
  return (
    <Section>
      <SectionHeading
        kicker="Бронирование"
        title={
          <>
            Ваш стол <span className="italic text-shu">уже ждёт</span>
          </>
        }
        jp="ご予約"
        lead="Пять шагов и никакого «мы вам перезвоним»: занятое время и занятые столы видно сразу."
      />
      <div className="mt-10">
        <BookingWizard />
      </div>
    </Section>
  );
}
