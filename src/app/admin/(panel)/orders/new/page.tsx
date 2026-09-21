import { unavailableItemsSafe } from "@/lib/db/availability";
import { Shell } from "@/components/admin/Shell";
import { PhoneOrderForm } from "@/components/admin/PhoneOrderForm";

export const dynamic = "force-dynamic";

/**
 * Заказ по телефону. Для ресторана это основной канал, а не дополнение к сайту:
 * гость звонит, менеджер собирает корзину за него.
 */
export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;
  const unavailable = await unavailableItemsSafe();

  return (
    <Shell title="Новый заказ" subtitle="принят по телефону">
      <PhoneOrderForm
        unavailable={Object.fromEntries(unavailable)}
        initialPhone={phone ?? ""}
      />
    </Shell>
  );
}
