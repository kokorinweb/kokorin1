import Link from "next/link";
import { loadDashboard } from "@/lib/db/stats";
import { reservationsToday } from "@/lib/db/reservations";
import { unavailableItems } from "@/lib/db/availability";
import { getMenuItem } from "@/lib/menu";
import { sourceLabel } from "@/lib/order";
import { Shell } from "@/components/admin/Shell";
import { StatTile } from "@/components/admin/StatTile";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { CategoryDonut } from "@/components/admin/CategoryDonut";
import { PeriodPicker } from "@/components/admin/PeriodPicker";
import { Card, CardHead } from "@/components/admin/ui";
import { money, moment } from "@/components/admin/format";

export const dynamic = "force-dynamic";

/**
 * Плитка текущего состояния: не сравнивается с прошлым периодом, потому что
 * отвечает на вопрос «что происходит прямо сейчас», а не «как мы жили в июле».
 */
function OpsTile({
  label,
  value,
  hint,
  href,
  alarm = false,
}: {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  alarm?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 transition ${
        alarm
          ? "border-warn/25 bg-warn-tint hover:border-warn/40"
          : "border-line bg-white hover:bg-tint/60"
      }`}
    >
      <p className={`text-sm font-semibold ${alarm ? "text-warn" : "text-ink-soft"}`}>{label}</p>
      <div>
        <p className={`text-2xl leading-none font-bold tracking-tight ${alarm ? "text-warn" : ""}`}>
          {value}
        </p>
        <p className={`mt-1 text-[11px] ${alarm ? "text-warn/80" : "text-ink-muted"}`}>{hint}</p>
      </div>
    </Link>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;

  const [data, reservations, stopped] = await Promise.all([
    loadDashboard(period),
    reservationsToday(),
    unavailableItems(),
  ]);

  const categoryTotal = data.byCategory.reduce((sum, slice) => sum + slice.revenue, 0);
  const channelTotal = data.channels.reduce((sum, channel) => sum + channel.orders, 0);
  const stoppedNames = [...stopped.keys()]
    .map((id) => getMenuItem(id)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <Shell
      title="Сводка"
      subtitle={`${data.period.title.toLowerCase()} · заказов ${data.current.orders}`}
      actions={<PeriodPicker active={data.period.id} />}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 self-start sm:grid-cols-2">
          <StatTile
            accent
            label="Выручка"
            value={money(data.current.revenue)}
            current={data.current.revenue}
            previous={data.previous.revenue}
          />
          <StatTile
            label="Заказов"
            value={String(data.current.orders)}
            current={data.current.orders}
            previous={data.previous.orders}
          />
          <StatTile
            label="Средний чек"
            value={money(data.current.avgCheck)}
            current={data.current.avgCheck}
            previous={data.previous.avgCheck}
          />
          <StatTile
            inverted
            label="Отмены"
            value={String(data.current.cancelled)}
            current={data.current.cancelled}
            previous={data.previous.cancelled}
            hint={
              data.current.orders + data.current.cancelled > 0
                ? `${Math.round(
                    (data.current.cancelled / (data.current.orders + data.current.cancelled)) * 100,
                  )}% от всех заказов`
                : undefined
            }
          />
        </div>

        <RevenueChart
          points={data.series}
          granularity={data.granularity}
          total={data.current.revenue}
        />
      </div>

      {/* Полоса «прямо сейчас»: четыре вопроса, на которые владелец смотрит первым делом. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OpsTile
          label="Ждут подтверждения"
          value={data.pendingNew}
          hint={data.pendingNew > 0 ? "открыть новые заказы" : "все заказы приняты"}
          href="/admin/orders?group=new"
          alarm={data.pendingNew > 0}
        />
        <OpsTile
          label="В работе на кухне"
          value={data.inProgress}
          hint="приняты, готовятся, едут"
          href="/admin/orders?group=active"
        />
        <OpsTile
          label="Брони на сегодня"
          value={reservations.count}
          hint={
            reservations.next
              ? `ближайшая — ${moment(reservations.next.at)}, ${reservations.next.guests} чел.`
              : reservations.count > 0
                ? `${reservations.guests} гостей`
                : "на сегодня броней нет"
          }
          href="/admin/reservations"
        />
        <OpsTile
          label="В стоп-листе"
          value={stopped.size}
          hint={
            stoppedNames.length > 0
              ? stoppedNames.slice(0, 2).join(", ") + (stoppedNames.length > 2 ? " и ещё…" : "")
              : "всё меню доступно"
          }
          href="/admin/stoplist"
          alarm={stopped.size > 0}
        />
      </div>

      <div className="grid items-start grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-3">
        <CategoryDonut slices={data.byCategory} total={categoryTotal} />

        {data.topDishes.length > 0 ? (
          <Card>
            <CardHead title="Топ блюд" hint="за период, по количеству" />
            <ol className="mt-3 space-y-1.5 text-sm">
              {data.topDishes.map((dish) => (
                <li key={dish.itemId} className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{dish.itemName}</span>
                  <span className="shrink-0 font-bold tabular-nums">{dish.quantity} шт</span>
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-muted">
                    {money(dish.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        ) : null}

        <div className="space-y-4">
          <Card>
            <CardHead title="Каналы" hint="откуда пришли заказы за период" />
            {data.channels.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">За период заказов не было.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {data.channels.map((channel) => {
                  const share = channelTotal > 0 ? channel.orders / channelTotal : 0;
                  return (
                    <li key={channel.source}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-ink-soft">{sourceLabel(channel.source)}</span>
                        <span className="shrink-0 tabular-nums">
                          <b>{channel.orders}</b>
                          <span className="text-xs text-ink-muted">
                            {" "}
                            зак. · {money(channel.revenue)}
                          </span>
                        </span>
                      </div>
                      {/* Одна полоса — одна доля: это мера, а не декоративный прогресс-бар. */}
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-tint">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.max(share * 100, 2)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHead title="Гости" hint="за всё время" />
            <div className="mt-3 flex items-end gap-6">
              <div>
                <p className="text-2xl leading-none font-bold tracking-tight">
                  {data.totalCustomers}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">всего номеров</p>
              </div>
              <div>
                <p className="text-2xl leading-none font-bold tracking-tight text-accent-strong">
                  {data.repeatCustomers}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">заказали больше раза</p>
              </div>
            </div>
            <Link
              href="/admin/customers"
              className="mt-4 inline-block text-sm text-accent-strong underline"
            >
              Открыть список гостей
            </Link>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
