import Link from "next/link";
import type { Order } from "@/lib/db/orders";
import { StatusControl } from "./StatusControl";
import { money, moment, relative } from "./format";
import { formatPhone } from "@/lib/phone";

/**
 * Стол заказов.
 *
 * Чего здесь нет по сравнению с мокапом интернет-магазина и почему:
 * — колонки «Payment»: онлайн-оплаты в проекте нет, платят курьеру или на кассе,
 *   поэтому вместо неё способ получения — доставка или самовывоз;
 * — колонки «Category»: в заказе пять блюд из трёх категорий, одна категория на
 *   заказ ничего не означает, поэтому здесь количество позиций;
 * — чекбоксов у строк: групповых действий нет, а чекбокс, который ничего не
 *   делает, — обман.
 */
export function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]">
        <p className="font-medium">Ни одного заказа по этому фильтру.</p>
        <p className="mt-1 text-sm text-slate">
          Сбросьте поиск или загрузите демо-данные: <code className="font-mono">npm run db:seed</code>
        </p>
      </div>
    );
  }

  return (
    <>
      {/*
        * На телефоне таблица из восьми колонок уезжает в горизонтальную прокрутку,
        * и статус — единственное, что менеджеру нужно в смене нажать, — оказывается
        * за краем экрана. Поэтому до sm показываем карточки, а не строки.
        */}
      <ul className="space-y-3 sm:hidden">
        {orders.map((order) => (
          <li
            key={order.number}
            className="rounded-3xl bg-white p-4 shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/orders/${order.number}`}
                  className="font-semibold tabular-nums hover:text-basil hover:underline"
                >
                  {order.number}
                </Link>
                <p className="truncate text-sm">{order.customerName}</p>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="text-xs text-slate tabular-nums"
                >
                  {formatPhone(order.customerPhone)}
                </a>
              </div>
              <StatusControl
                number={order.number}
                status={order.status}
                fulfillment={order.fulfillment}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-slate">
              <span className="font-semibold text-ink tabular-nums">{money(order.total)}</span>
              <span>{order.itemsCount} поз.</span>
              <span>{order.fulfillment === "delivery" ? "доставка" : "самовывоз"}</span>
              <span className="tabular-nums">{relative(order.createdAt)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)] sm:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead>
            <tr className="bg-panel text-xs font-semibold uppercase tracking-wide text-slate">
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
              <tr key={order.number} className="border-t border-line hover:bg-panel/60">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/orders/${order.number}`}
                    className="font-semibold tabular-nums hover:text-basil hover:underline"
                  >
                    {order.number}
                  </Link>
                  <p className="text-[11px] text-slate">
                    {order.source === "telegram" ? "телеграм" : "сайт"}
                  </p>
                </td>

                <td className="px-3 py-3">
                  <p className="font-medium">{order.customerName}</p>
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="text-[11px] text-slate tabular-nums hover:text-ink"
                  >
                    {formatPhone(order.customerPhone)}
                  </a>
                </td>

                <td className="px-3 py-3 text-right tabular-nums">{order.itemsCount}</td>

                <td className="px-3 py-3 text-right font-semibold tabular-nums">
                  {money(order.total)}
                </td>

                <td className="px-3 py-3">
                  <p className="tabular-nums">{moment(order.createdAt)}</p>
                  <p className="text-[11px] text-slate">{relative(order.createdAt)}</p>
                </td>

                <td className="px-3 py-3">
                  {order.fulfillment === "delivery" ? (
                    <span className="text-ink-soft">Доставка</span>
                  ) : (
                    <span className="text-ink-soft">Самовывоз</span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <StatusControl
                    number={order.number}
                    status={order.status}
                    fulfillment={order.fulfillment}
                  />
                </td>

                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/orders/${order.number}`}
                    aria-label={`Открыть заказ ${order.number}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate transition hover:bg-ink/5 hover:text-ink"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
