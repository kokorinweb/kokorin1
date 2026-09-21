import type { Metadata } from "next";
import { CartScreen } from "@/components/CartScreen";
import { unavailableItemsSafe } from "@/lib/db/availability";

export const metadata: Metadata = {
  title: "Корзина",
  description: "Оформление заказа: доставка по центру Москвы или самовывоз со скидкой.",
};

// Стоп-лист меняется в течение вечера, поэтому страницу не кешируем.
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const unavailable = await unavailableItemsSafe();
  return <CartScreen unavailable={Object.fromEntries(unavailable)} />;
}
