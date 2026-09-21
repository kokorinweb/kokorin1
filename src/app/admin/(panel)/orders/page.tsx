import Link from "next/link";
import { listOrders, statusCounts } from "@/lib/db/orders";
import { STATUS_GROUPS, STATUS_META, type OrderStatus } from "@/lib/status";
import { Shell } from "@/components/admin/Shell";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { Button, INPUT_CLASS, SELECT_CLASS } from "@/components/admin/ui";
import type { Fulfillment } from "@/lib/order";

export const dynamic = "force-dynamic";

/** Плитки-вкладки: цифра в плитке и есть навигация по стадиям кухни. */
const TABS = ["new", "kitchen", "handoff", "done"] as const;

const TAB_TONE: Record<string, string> = {
  new: "border-warn/25 bg-warn-tint",
  kitchen: "border-violet/25 bg-violet-tint",
  handoff: "border-blue/25 bg-blue-tint",
  done: "border-accent/25 bg-accent-tint",
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== 0) query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string; fulfillment?: string; page?: string }>;
}) {
  const params = await searchParams;
  const group = params.group ?? "";
  const q = params.q?.trim() ?? "";
  const fulfillment: Fulfillment | undefined =
    params.fulfillment === "delivery" || params.fulfillment === "pickup"
      ? params.fulfillment
      : undefined;

  const [list, counts] = await Promise.all([
    listOrders({ group, q, fulfillment, page: Number(params.page ?? 1), perPage: 15 }),
    statusCounts(),
  ]);

  const countFor = (statuses: readonly OrderStatus[]) =>
    statuses.reduce((sum, status) => sum + counts[status], 0);
  const totalAll = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const filtered = Boolean(q || fulfillment);
  const exportHref = `/admin/orders/export${buildQuery({ group, q, fulfillment })}`;

  return (
    <Shell
      title="Заказы"
      subtitle={`${list.total} ${list.total === 1 ? "заказ" : "заказов"} по текущему фильтру`}
      actions={
        <a
          href={exportHref}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-tint"
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
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
          </svg>
          CSV
        </a>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TABS.map((id) => {
          const tab = STATUS_GROUPS.find((item) => item.id === id)!;
          const active = group === id;

          return (
            <Link
              key={id}
              href={`/admin/orders${buildQuery({ group: id, q, fulfillment })}`}
              aria-current={active ? "true" : undefined}
              className={`rounded-2xl border p-4 transition ${TAB_TONE[id]} ${
                active ? "ring-2 ring-ink/15" : "hover:brightness-[0.99]"
              }`}
            >
              <p className="text-sm font-semibold text-ink-soft">{tab.title}</p>
              <p className="mt-3 text-2xl leading-none font-bold tracking-tight">
                {countFor(tab.statuses)}
              </p>
              <p className="mt-1 text-[11px] text-ink-soft/75">
                {tab.statuses.map((status) => STATUS_META[status].label).join(" · ")}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Один ряд фильтров над таблицей. Работает обычной GET-формой, без JS. */}
      <form
        method="get"
        action="/admin/orders"
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3"
      >
        <input type="hidden" name="group" value={group} />

        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Поиск заказа</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Номер, имя или телефон"
            className={INPUT_CLASS}
          />
        </label>

        <label>
          <span className="sr-only">Способ получения</span>
          <select name="fulfillment" defaultValue={fulfillment ?? ""} className={SELECT_CLASS}>
            <option value="">Любой способ</option>
            <option value="delivery">Доставка</option>
            <option value="pickup">Самовывоз</option>
          </select>
        </label>

        <Button type="submit">Найти</Button>

        {filtered ? (
          <Link
            href={`/admin/orders${buildQuery({ group })}`}
            className="px-3 py-2.5 text-sm text-ink-muted underline hover:text-ink"
          >
            Сбросить
          </Link>
        ) : null}

        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          <Link
            href={`/admin/orders${buildQuery({ q, fulfillment })}`}
            className={`hover:text-ink ${group === "" ? "font-bold text-ink" : ""}`}
          >
            Все ({totalAll})
          </Link>
          <Link
            href={`/admin/orders${buildQuery({ group: "active", q, fulfillment })}`}
            className={`hover:text-ink ${group === "active" ? "font-bold text-ink" : ""}`}
          >
            В работе ({countFor(["new", "accepted", "cooking"])})
          </Link>
          <Link
            href={`/admin/orders${buildQuery({ group: "cancelled", q, fulfillment })}`}
            className={`hover:text-ink ${group === "cancelled" ? "font-bold text-ink" : ""}`}
          >
            Отменённые ({counts.cancelled})
          </Link>
        </span>
      </form>

      <OrdersTable orders={list.orders} />

      {list.pages > 1 ? (
        <nav className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-3 text-sm">
          <span className="text-ink-muted">
            Страница {list.page} из {list.pages}
          </span>
          <span className="flex gap-2">
            {list.page > 1 ? (
              <Link
                href={`/admin/orders${buildQuery({ group, q, fulfillment, page: list.page - 1 })}`}
                className="rounded-xl bg-tint px-3 py-1.5 font-semibold transition hover:bg-line"
              >
                ← Назад
              </Link>
            ) : null}
            {list.page < list.pages ? (
              <Link
                href={`/admin/orders${buildQuery({ group, q, fulfillment, page: list.page + 1 })}`}
                className="rounded-xl bg-tint px-3 py-1.5 font-semibold transition hover:bg-line"
              >
                Вперёд →
              </Link>
            ) : null}
          </span>
        </nav>
      ) : null}
    </Shell>
  );
}
