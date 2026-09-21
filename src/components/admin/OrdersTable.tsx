import type { Order } from "@/lib/db/orders";
import { OrderCard, OrderRow } from "./OrderRow";
import { Empty } from "./ui";

/**
 * Стол заказов.
 *
 * Чего здесь нет по сравнению с мокапами интернет-магазинов и почему:
 * — колонки «оплата»: онлайн-оплаты в проекте нет, платят курьеру или на кассе,
 *   поэтому вместо неё способ получения;
 * — колонки «категория»: в заказе пять блюд из трёх категорий, одна категория на
 *   заказ ничего не означает, поэтому здесь количество позиций;
 * — чекбоксов у строк: групповых действий нет, а чекбокс, который ничего не
 *   делает, — обман.
 */
export function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <Empty
        title="Ни одного заказа по этому фильтру"
        hint="Сбросьте поиск или выберите другую вкладку. Если база пустая — демо-данные ставит команда npm run db:seed."
      />
    );
  }

  return (
    <>
      <ul className="space-y-3 sm:hidden">
        {orders.map((order) => (
          <OrderCard key={order.number} order={order} />
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl border border-line bg-white sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="bg-tint text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                <th className="px-5 py-3">Номер</th>
                <th className="px-3 py-3">Гость</th>
                <th className="px-3 py-3 text-right">Позиций</th>
                <th className="px-3 py-3 text-right">Сумма</th>
                <th className="px-3 py-3">Когда</th>
                <th className="px-3 py-3">Способ</th>
                <th className="px-3 py-3">Статус</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow key={order.number} order={order} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
