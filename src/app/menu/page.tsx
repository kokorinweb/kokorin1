import type { Metadata } from "next";
import { MenuBrowser } from "@/components/MenuBrowser";
import { CartBar } from "@/components/CartBar";
import { Section, SectionHeading } from "@/components/Section";
import { CATEGORIES, type CategoryId } from "@/lib/menu";

export const metadata: Metadata = {
  title: "Меню",
  description:
    "Роллы, суши, сеты, сашими, горячее, супы, салаты, закуски, десерты и напитки. Фильтры по острым, вегетарианским, с лососем и тунцом.",
};

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const requested = params.category;
  const initialCategory = CATEGORIES.some((category) => category.id === requested)
    ? (requested as CategoryId)
    : undefined;

  return (
    <>
      <Section>
        <SectionHeading
          kicker="47 позиций"
          title="Меню"
          jp="お品書き"
          lead="Всё готовится после заказа. Состав, вес и цена указаны честно — то, что в карточке, то и на тарелке."
        />
        <div className="mt-10">
          <MenuBrowser initialCategory={initialCategory} />
        </div>
      </Section>
      <CartBar />
    </>
  );
}
