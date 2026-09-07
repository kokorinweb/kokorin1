import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { Section, SectionHeading } from "@/components/Section";
import { pickupTimes } from "@/lib/booking";

export const metadata: Metadata = {
  title: "Корзина",
  description: "Оформление заказа: забрать с собой или подать к забронированному столику.",
};

/** Список времени самовывоза зависит от «сейчас» — кешировать страницу нельзя. */
export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <Section>
      <SectionHeading
        kicker="Оформление"
        title="Корзина"
        jp="お会計"
        lead="Суммы считает сервер по актуальному меню — то, что вы видите здесь, и будет в чеке."
      />
      <div className="mt-10">
        <CartView pickupOptions={pickupTimes()} />
      </div>
    </Section>
  );
}
