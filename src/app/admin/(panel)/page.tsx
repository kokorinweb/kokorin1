import Link from "next/link";
import { loadDashboard } from "@/lib/db/stats";
import { Shell } from "@/components/admin/Shell";
import { StatTile } from "@/components/admin/StatTile";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { CategoryDonut } from "@/components/admin/CategoryDonut";
import { PeriodPicker } from "@/components/admin/PeriodPicker";
import { money } from "@/components/admin/format";

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
  tone = "plain",
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
  tone?: "plain" | "warn";
}) {
  const body = (
    <div
      className={`flex h-full flex-col justify-between gap-6 rounded-3xl p-5 transition ${
        tone === "warn"
          ? "bg-terracotta/10 ring-1 ring-terracotta/20 hover:bg-terracotta/15"
          : "bg-white shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)] hover:bg-panel"
      }`}
    >
      <p className={`text-sm font-medium ${tone === "warn" ? "text-terracotta" : "text-ink-soft"}`}>
        {label}
      </p>
      <div>
        <p className="text-3xl leading-none font-semibold tracking-tight">{value}</p>
        <p className={`mt-1.5 text-xs ${tone === "warn" ? "text-terracotta/80" : "text-slate"}`}>
          {hint}
        </p>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const data = await loadDashboard(period);

  const categoryTotal = data.byCategory.reduce((sum, slice) => sum + slice.revenue, 0);

  return (
    <Shell
      title="Сводка"
      subtitle={`${data.period.title.toLowerCase()} · заказов ${data.current.orders}`}
      actions={<PeriodPicker active={data.period.id} />}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
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
                    (data.current.cancelled /
                      (data.current.orders + data.current.cancelled)) *
                      100,
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* content-start: карточки держат свою высоту, а не растягиваются под соседнюю колонку. */}
        <div className="grid gap-4 self-start sm:grid-cols-2">
          <OpsTile
            label="Ждут подтверждения"
            value={String(data.pendingNew)}
            hint={
              data.pendingNew > 0
                ? "нажмите, чтобы открыть новые"
                : "все заказы приняты"
            }
            href="/admin/orders?group=new"
            tone={data.pendingNew > 0 ? "warn" : "plain"}
          />
          <OpsTile
            label="В работе на кухне"
            value={String(data.inProgress)}
            hint="приняты, готовятся, едут"
            href="/admin/orders?group=active"
          />
          <div className="rounded-3xl bg-white p-5 shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)] sm:col-span-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">Гости</h2>
              <p className="text-xs text-slate">за всё время</p>
            </div>
            <div className="mt-3 flex items-end gap-6">
              <div>
                <p className="text-3xl leading-none font-semibold tracking-tight">
                  {data.totalCustomers}
                </p>
                <p className="mt-1 text-xs text-slate">всего номеров</p>
              </div>
              <div>
                <p className="text-3xl leading-none font-semibold tracking-tight text-basil">
                  {data.repeatCustomers}
                </p>
                <p className="mt-1 text-xs text-slate">заказали больше раза</p>
              </div>
            </div>

          </div>
        </div>

        <div className="space-y-4">
          <CategoryDonut slices={data.byCategory} total={categoryTotal} />

          {data.topDishes.length > 0 ? (
            <section className="rounded-3xl bg-white p-5 shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">Топ блюд</h2>
                <p className="text-xs text-slate">за период, по количеству</p>
              </div>
              <ol className="mt-3 space-y-1.5 text-sm">
                {data.topDishes.map((dish) => (
                  <li key={dish.itemId} className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{dish.itemName}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{dish.quantity} шт</span>
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate">
                      {money(dish.revenue)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
