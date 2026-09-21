/**
 * Агрегаты для дашборда.
 *
 * Все сутки считаются по времени заведения, а не по UTC: заказ, принятый
 * в 01:30 по Москве, для кухни — это ночь пятницы, а не утро субботы.
 * Часовой пояс берём из RESTAURANT_TZ, по умолчанию Europe/Moscow.
 *
 * Отменённые заказы не попадают в выручку и в число заказов, но считаются отдельно:
 * менеджеру важно видеть, сколько заказов отвалилось.
 */
import { getDb, toDate } from "./client";
import { CATEGORIES } from "../menu";
import { RESTAURANT } from "../restaurant";

const TZ = process.env.RESTAURANT_TZ ?? RESTAURANT.timezone;

export const PERIODS = [
  { id: "today", title: "Сегодня", days: 1 },
  { id: "7d", title: "7 дней", days: 7 },
  { id: "30d", title: "30 дней", days: 30 },
  { id: "90d", title: "90 дней", days: 90 },
] as const;

export type PeriodId = (typeof PERIODS)[number]["id"];

export function resolvePeriod(id: string | undefined) {
  return PERIODS.find((period) => period.id === id) ?? PERIODS[2];
}

type Totals = {
  orders: number;
  revenue: number;
  cancelled: number;
  customers: number;
  /** Средний чек по неотменённым заказам, ₽. */
  avgCheck: number;
};

export type SeriesPoint = { at: Date; revenue: number; orders: number };

export type CategorySlice = {
  id: string;
  title: string;
  revenue: number;
  share: number;
};

export type DishRow = { itemId: string; itemName: string; quantity: number; revenue: number };

export type Dashboard = {
  period: { id: string; title: string; days: number; from: Date; to: Date };
  current: Totals;
  previous: Totals;
  /** За сутки график идёт по часам, за период длиннее — по дням. */
  granularity: "hour" | "day";
  series: SeriesPoint[];
  byCategory: CategorySlice[];
  topDishes: DishRow[];
  /** Сколько заказов прямо сейчас требуют действия — без привязки к периоду. */
  pendingNew: number;
  inProgress: number;
  /** Клиенты с двумя и более заказами за всё время. */
  repeatCustomers: number;
  totalCustomers: number;
};

const TOTALS_SQL = `
  select
    count(*) filter (where status <> 'cancelled')::int                        as orders,
    coalesce(sum(total) filter (where status <> 'cancelled'), 0)::int         as revenue,
    count(*) filter (where status = 'cancelled')::int                         as cancelled,
    count(distinct customer_phone) filter (where status <> 'cancelled')::int  as customers
  from orders
  where created_at >= $1 and created_at < $2
`;

function withAvg(row: {
  orders: number;
  revenue: number;
  cancelled: number;
  customers: number;
}): Totals {
  return {
    ...row,
    avgCheck: row.orders > 0 ? Math.round(row.revenue / row.orders) : 0,
  };
}

/** Прирост в процентах. null — если сравнивать не с чем: врать «+100%» на пустой базе нельзя. */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function loadDashboard(periodId: string | undefined): Promise<Dashboard> {
  const db = await getDb();
  const period = resolvePeriod(periodId);

  // Границы окон считает сама база — иначе придётся руками воспроизводить
  // правила часового пояса в JavaScript и однажды на них наступить.
  const [bounds] = await db.query<{
    cur_from: unknown;
    cur_to: unknown;
    prev_from: unknown;
    prev_to: unknown;
  }>(
    `select
       (((now() at time zone $2)::date - ($1::int - 1))::timestamp at time zone $2)  as cur_from,
       (((now() at time zone $2)::date + 1)::timestamp at time zone $2)              as cur_to,
       (((now() at time zone $2)::date - ($1::int * 2 - 1))::timestamp at time zone $2) as prev_from,
       (((now() at time zone $2)::date - ($1::int - 1))::timestamp at time zone $2)  as prev_to`,
    [period.days, TZ],
  );

  const curFrom = toDate(bounds!.cur_from);
  const curTo = toDate(bounds!.cur_to);
  const prevFrom = toDate(bounds!.prev_from);
  const prevTo = toDate(bounds!.prev_to);

  const [[current], [previous], seriesRows, byCategoryRows, topRows, [customers]] =
    await Promise.all([
      db.query<{ orders: number; revenue: number; cancelled: number; customers: number }>(
        TOTALS_SQL,
        [curFrom, curTo],
      ),
      db.query<{ orders: number; revenue: number; cancelled: number; customers: number }>(
        TOTALS_SQL,
        [prevFrom, prevTo],
      ),
      period.days === 1
        ? // Один день одной полосой — это не график, а плитка. За сутки смотрим по часам:
          // ресторану как раз важно, где обеденный пик, а где вечерний.
          db.query<{ at: unknown; revenue: number; orders: number }>(
            `select
               gs                                        as at,
               coalesce(sum(o.total), 0)::int            as revenue,
               count(o.id)::int                          as orders
             from generate_series(
                    ((now() at time zone $1)::date)::timestamp,
                    ((now() at time zone $1)::date)::timestamp + interval '23 hours',
                    interval '1 hour'
                  ) gs
             left join orders o
                    on date_trunc('hour', o.created_at at time zone $1) = gs
                   and o.status <> 'cancelled'
             group by gs
             order by gs`,
            [TZ],
          )
        : db.query<{ at: unknown; revenue: number; orders: number }>(
            `select
               gs::date                                  as at,
               coalesce(sum(o.total), 0)::int            as revenue,
               count(o.id)::int                          as orders
             from generate_series(
                    ((now() at time zone $2)::date - ($1::int - 1)),
                    ((now() at time zone $2)::date),
                    interval '1 day'
                  ) gs
             left join orders o
                    on (o.created_at at time zone $2)::date = gs::date
                   and o.status <> 'cancelled'
             group by gs
             order by gs`,
            [period.days, TZ],
          ),
      db.query<{ category: string; revenue: number }>(
        `select l.category, coalesce(sum(l.line_total), 0)::int as revenue
         from order_lines l
         join orders o on o.id = l.order_id
         where o.created_at >= $1 and o.created_at < $2 and o.status <> 'cancelled'
         group by l.category`,
        [curFrom, curTo],
      ),
      db.query<{ item_id: string; item_name: string; quantity: number; revenue: number }>(
        `select l.item_id, l.item_name,
                sum(l.quantity)::int   as quantity,
                sum(l.line_total)::int as revenue
         from order_lines l
         join orders o on o.id = l.order_id
         where o.created_at >= $1 and o.created_at < $2 and o.status <> 'cancelled'
         group by l.item_id, l.item_name
         order by quantity desc
         limit 5`,
        [curFrom, curTo],
      ),
      db.query<{ total: number; repeat: number }>(
        `select
           count(*)::int                             as total,
           count(*) filter (where orders_count > 1)::int as repeat
         from (
           select customer_phone, count(*)::int as orders_count
           from orders
           where status <> 'cancelled'
           group by customer_phone
         ) c`,
      ),
    ]);

  const counts = await db.query<{ status: string; count: number }>(
    `select status, count(*)::int as count from orders group by status`,
  );
  const countOf = (statuses: string[]) =>
    counts
      .filter((row) => statuses.includes(row.status))
      .reduce((sum, row) => sum + row.count, 0);

  const categoryRevenue = new Map(byCategoryRows.map((row) => [row.category, row.revenue]));
  const totalCategoryRevenue = byCategoryRows.reduce((sum, row) => sum + row.revenue, 0);

  return {
    period: { ...period, from: curFrom, to: curTo },
    current: withAvg(current ?? { orders: 0, revenue: 0, cancelled: 0, customers: 0 }),
    previous: withAvg(previous ?? { orders: 0, revenue: 0, cancelled: 0, customers: 0 }),
    granularity: period.days === 1 ? "hour" : "day",
    series: seriesRows.map((row) => ({
      at: toDate(row.at),
      revenue: row.revenue,
      orders: row.orders,
    })),
    // Порядок категорий — как в меню, чтобы цвета в доте не прыгали от месяца к месяцу.
    byCategory: CATEGORIES.map((category) => {
      const revenue = categoryRevenue.get(category.id) ?? 0;
      return {
        id: category.id,
        title: category.subtitle,
        revenue,
        share: totalCategoryRevenue > 0 ? revenue / totalCategoryRevenue : 0,
      };
    }).filter((slice) => slice.revenue > 0),
    topDishes: topRows.map((row) => ({
      itemId: row.item_id,
      itemName: row.item_name,
      quantity: row.quantity,
      revenue: row.revenue,
    })),
    pendingNew: countOf(["new"]),
    inProgress: countOf(["new", "accepted", "cooking", "on_way", "ready"]),
    repeatCustomers: customers?.repeat ?? 0,
    totalCustomers: customers?.total ?? 0,
  };
}
