import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/db/customers";
import { STATUS_META } from "@/lib/status";
import { sourceLabel } from "@/lib/order";
import { Shell } from "@/components/admin/Shell";
import { Card, CardHead, ButtonLink } from "@/components/admin/ui";
import { CustomerTags } from "@/components/admin/CustomerTags";
import { CustomerNotes } from "@/components/admin/CustomerNotes";
import { money, moment, dayLabel, relative } from "@/components/admin/format";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const decoded = decodeURIComponent(phone);
  const found = await getCustomer(decoded);

  if (!found) notFound();

  const { customer, orders, favourites, notes } = found;

  return (
    <Shell
      title={customer.name}
      subtitle={`${formatPhone(customer.phone)} · ${customer.ordersCount} ${
        customer.ordersCount === 1 ? "заказ" : "заказов"
      }`}
      actions={
        <>
          <a
            href={`tel:${customer.phone}`}
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-tint"
          >
            Позвонить
          </a>
          <ButtonLink
            href={`/admin/orders/new?phone=${encodeURIComponent(customer.phone)}`}
            tone="primary"
          >
            Заказ для гостя
          </ButtonLink>
        </>
      }
    >
      <Link href="/admin/customers" className="text-sm text-ink-muted underline hover:text-ink">
        ← Ко всем гостям
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-4">
          <Card>
            <CardHead title="Цифры" hint="по неотменённым заказам" />
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[11px] text-ink-muted">Всего оставил</dt>
                <dd className="text-xl font-bold tracking-tight tabular-nums">
                  {money(customer.spent)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-muted">Средний чек</dt>
                <dd className="text-xl font-bold tracking-tight tabular-nums">
                  {money(customer.avgCheck)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-muted">Первый заказ</dt>
                <dd className="text-sm font-semibold">
                  {customer.firstOrderAt ? dayLabel(customer.firstOrderAt) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-muted">Последний заказ</dt>
                <dd className="text-sm font-semibold">
                  {customer.lastOrderAt ? relative(customer.lastOrderAt) : "—"}
                </dd>
              </div>
              {customer.cancelledCount > 0 ? (
                <div className="col-span-2">
                  <dt className="text-[11px] text-ink-muted">Отменённых заказов</dt>
                  <dd className="text-sm font-semibold text-warn">{customer.cancelledCount}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card>
            <CardHead title="Метки" hint="видно в списке гостей" />
            <div className="mt-3">
              <CustomerTags phone={customer.phone} active={customer.tags} />
            </div>
          </Card>

          <Card>
            <CardHead title="Заметки" hint="то, чего не видно в заказах" />
            <div className="mt-3">
              <CustomerNotes phone={customer.phone} notes={notes} />
            </div>
          </Card>

          {favourites.length > 0 ? (
            <Card>
              <CardHead title="Любимые блюда" hint="по количеству за всё время" />
              <ul className="mt-3 space-y-1.5 text-sm">
                {favourites.map((dish) => (
                  <li key={dish.itemName} className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{dish.itemName}</span>
                    <span className="shrink-0 font-bold tabular-nums">{dish.quantity} шт</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <Card padded={false} className="self-start overflow-hidden">
          <div className="p-5 pb-3">
            <CardHead title="История заказов" hint={`${orders.length} последних`} />
          </div>

          {orders.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-ink-muted">Заказов пока нет.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="bg-tint text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                    <th className="px-5 py-2.5">Номер</th>
                    <th className="px-3 py-2.5">Когда</th>
                    <th className="px-3 py-2.5 text-right">Сумма</th>
                    <th className="px-5 py-2.5">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.number} className="border-t border-line hover:bg-tint/60">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/admin/orders/${order.number}`}
                          className="font-semibold tabular-nums hover:text-accent hover:underline"
                        >
                          {order.number}
                        </Link>
                        <p className="text-[11px] text-ink-muted">{sourceLabel(order.source)}</p>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{moment(order.createdAt)}</td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                        {money(order.total)}
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            STATUS_META[order.status].pill
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${STATUS_META[order.status].dot}`}
                          />
                          {STATUS_META[order.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
