import { Suspense } from "react";
import type { Metadata } from "next";
import { MenuBrowser } from "@/components/MenuBrowser";

export const metadata: Metadata = {
  title: "Меню",
  description:
    "Паста ручной работы, неаполитанская пицца, закуски, десерты и вино. Состав, аллергены и цены.",
};

export default function MenuPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="display text-5xl">Меню</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Все цены указаны за порцию. Аллергены перечислены для каждого блюда, но производство общее —
        следы других аллергенов возможны. При серьёзной аллергии обязательно предупредите менеджера.
      </p>

      <div className="mt-10">
        <Suspense fallback={<p className="text-ink-soft">Загружаем меню…</p>}>
          <MenuBrowser />
        </Suspense>
      </div>
    </div>
  );
}
