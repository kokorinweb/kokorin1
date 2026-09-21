import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db/orders";
import { STATUS_META } from "@/lib/status";
import { CATEGORIES } from "@/lib/menu";
import { RESTAURANT } from "@/lib/restaurant";
import { Shell } from "@/components/admin/Shell";
import { StatusControl } from "@/components/admin/StatusControl";
import { money, moment, relative } from "@/components/admin/format";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

function categoryTitle(id: string): string {
  return CATEGORIES.find((category) => category.id === id)?.subtitle ?? id;
}

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const found = await getOrder(decodeURIComponent(number));

  if (!found) notFound();

  const { order, lines, events } = found;

  return (
    <Shell
      title={order.number}
      monoTitle
      subtitle={`${moment(order.createdAt)} · ${relative(order.createdAt)}`}
      actions={
        <StatusControl
          number={order.number}
          status={order.status}
          fulfillment={order.fulfillment}
          size="md"
        />
      }
    >
      <Link href="/admin/orders" className="text-sm text-slate underline hover:text-ink">
        ← Ко всем заказам
      </Link>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]">
          <h2 className="px-5 pt-5 text-base font-semibold">Состав заказа</h2>
          {/* Цены — снапшот на момент заказа, а не текущие из меню. */}
          <p className="px-5 pb-3 text-xs text-slate">цены на момент оформления</p>

          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-xs font-semibold uppercase tracking-wide text-slate">
              <tr>
                <th className="px-5 py-2">Блюдо</th>
                <th className="px-3 py-2 text-right">Цена</th>
                <th className="px-3 py-2 text-right">Кол-во</th>
                <th className="px-5 py-2 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.itemId} className="border-t border-line">
                  <td className="px-5 py-2.5">
                    <p className="font-medium">{line.itemName}</p>
                    <p className="text-[11px] text-slate">{categoryTitle(line.category)}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                    {money(line.unitPrice)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{line.quantity}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                    {money(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Позиции</dt>
              <dd className="tabular-nums">{money(order.subtotal)}</dd>
            </div>
            {order.discount > 0 ? (
              <div className="flex justify-between text-basil">
                <dt>Скидка за самовывоз {RESTAURANT.pickup.discountPercent}%</dt>
                <dd className="tabular-nums">−{money(order.discount)}</dd>
              </div>
            ) : null}
            {order.deliveryFee > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-soft">Доставка</dt>
                <dd className="tabular-nums">{money(order.deliveryFee)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <dt>Итого</dt>
              <dd className="tabular-nums">{money(order.total)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-4">
          <section className="rounded-3xl bg-white p-5 shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]">
            <h2 className="text-base font-semibold">Гость</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate">Имя</dt>
                <dd className="font-medium">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate">Телефон</dt>
                <dd>
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="font-medium tabular-nums hover:text-basil hover:underline"
                  >
                    {formatPhone(order.customerPhone)}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate">Способ</dt>
                <dd className="font-medium">
                  {order.fulfillment === "delivery"
                    ? `Доставка · ${order.etaMinutes} мин`
                    : `Самовывоз · ${order.etaMinutes} мин`}
                </dd>
              </div>
              {order.address ? (
                <div>
                  <dt className="text-xs text-slate">Адрес</dt>
                  <dd className="font-medium">{order.address}</dd>
                </div>
              ) : null}
              {order.comment ? (
                <div>
                  <dt className="text-xs text-slate">Комментарий</dt>
                  <dd className="rounded-xl bg-gold/10 px-3 py-2 text-[#7a5612]">
                    {order.comment}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-slate">Откуда пришёл</dt>
                <dd className="font-medium">
                  {order.source === "telegram" ? "Телеграм-бот" : "Сайт"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]">
            <h2 className="text-base font-semibold">История</h2>
            <p className="text-xs text-slate">кто и когда двигал заказ</p>

            <ol className="mt-4 space-y-3 text-sm">
              {events.map((event, index) => (
                <li key={`${event.toStatus}-${index}`} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_META[event.toStatus].dot}`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{STATUS_META[event.toStatus].label}</p>
                    <p className="text-xs text-slate tabular-nums">
                      {moment(event.createdAt)} · {event.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </Shell>
  );
}
