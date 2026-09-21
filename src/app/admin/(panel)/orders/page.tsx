import Link from "next/link";
import { listOrders, statusCounts } from "@/lib/db/orders";
import { STATUS_GROUPS, STATUS_META, type OrderStatus } from "@/lib/status";
import { Shell } from "@/components/admin/Shell";
import { OrdersTable } from "@/components/admin/OrdersTable";
import type { Fulfillment } from "@/lib/order";

export const dynamic = "force-dynamic";

/** Плитки-вкладки как в мокапе: цифра в плитке и есть навигация. */
const TABS = ["new", "kitchen", "handoff", "done"] as const;

const TAB_TONE: Record<string, string> = {
  new: "bg-terracotta/10 ring-terracotta/20",
  kitchen: "bg-[#e8dff5] ring-[#c9b4e6]",
  handoff: "bg-[#dce9f7] ring-[#b6d2ec]",
  done: "bg-basil/15 ring-basil/30",
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
          className="inline-flex items-center gap-2 rounded-full bg-panel px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-ink/5"
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
      {/* Вкладки-плитки: сколько заказов ждёт на каждом шаге кухни. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TABS.map((id) => {
          const tab = STATUS_GROUPS.find((item) => item.id === id)!;
          const active = group === id;

          return (
            <Link
              key={id}
              href={`/admin/orders${buildQuery({ group: id, q, fulfillment })}`}
              className={`rounded-3xl p-4 ring-1 transition ${TAB_TONE[id]} ${
                active ? "ring-2 ring-ink/30" : "hover:ring-2"
              }`}
            >
              <p className="text-sm font-medium text-ink-soft">{tab.title}</p>
              <p className="mt-3 text-2xl leading-none font-semibold tracking-tight">
                {countFor(tab.statuses)}
              </p>
              <p className="mt-1 text-[11px] text-ink-soft/70">
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
        className="flex flex-wrap items-center gap-2 rounded-3xl bg-white p-3 shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]"
      >
        <input type="hidden" name="group" value={group} />

        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Поиск заказа</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Номер, имя или телефон"
            className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-sm outline-none focus:border-basil focus:bg-white"
          />
        </label>

        <label className="text-sm">
          <span className="sr-only">Способ получения</span>
          <select
            name="fulfillment"
            defaultValue={fulfillment ?? ""}
            className="rounded-xl border border-line bg-panel px-3 py-2.5 text-sm outline-none focus:border-basil focus:bg-white"
          >
            <option value="">Любой способ</option>
            <option value="delivery">Доставка</option>
            <option value="pickup">Самовывоз</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85"
        >
          Найти
        </button>

        {filtered ? (
          <Link
            href={`/admin/orders${buildQuery({ group })}`}
            className="rounded-xl px-3 py-2.5 text-sm text-slate underline hover:text-ink"
          >
            Сбросить
          </Link>
        ) : null}

        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate">
          <Link
            href={`/admin/orders${buildQuery({ q, fulfillment })}`}
            className={`hover:text-ink ${group === "" ? "font-semibold text-ink" : ""}`}
          >
            Все ({totalAll})
          </Link>
          <Link
            href={`/admin/orders${buildQuery({ group: "active", q, fulfillment })}`}
            className={`hover:text-ink ${group === "active" ? "font-semibold text-ink" : ""}`}
          >
            В работе ({countFor(["new", "accepted", "cooking"])})
          </Link>
          <Link
            href={`/admin/orders${buildQuery({ group: "cancelled", q, fulfillment })}`}
            className={`hover:text-ink ${group === "cancelled" ? "font-semibold text-ink" : ""}`}
          >
            Отменённые ({counts.cancelled})
          </Link>
        </span>
      </form>

      <OrdersTable orders={list.orders} />

      {list.pages > 1 ? (
        <nav className="flex items-center justify-between rounded-3xl bg-white px-5 py-3 text-sm shadow-[0_18px_50px_-40px_rgba(34,29,23,0.55)]">
          <span className="text-slate">
            Страница {list.page} из {list.pages}
          </span>
          <span className="flex gap-2">
            {list.page > 1 ? (
              <Link
                href={`/admin/orders${buildQuery({ group, q, fulfillment, page: list.page - 1 })}`}
                className="rounded-xl bg-panel px-3 py-1.5 font-medium transition hover:bg-ink/5"
              >
                ← Назад
              </Link>
            ) : null}
            {list.page < list.pages ? (
              <Link
                href={`/admin/orders${buildQuery({ group, q, fulfillment, page: list.page + 1 })}`}
                className="rounded-xl bg-panel px-3 py-1.5 font-medium transition hover:bg-ink/5"
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
