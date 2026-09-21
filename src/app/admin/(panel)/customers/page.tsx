import Link from "next/link";
import { listCustomers, type CustomerSort } from "@/lib/db/customers";
import { CUSTOMER_TAGS, tagMeta } from "@/lib/tags";
import { Shell } from "@/components/admin/Shell";
import { Button, Empty, INPUT_CLASS, SELECT_CLASS } from "@/components/admin/ui";
import { money, dayLabel, relative } from "@/components/admin/format";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const SORTS: { id: CustomerSort; title: string }[] = [
  { id: "last", title: "По последнему заказу" },
  { id: "orders", title: "По числу заказов" },
  { id: "spent", title: "По сумме" },
  { id: "name", title: "По имени" },
];

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== 0) query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const tag = params.tag ?? "";
  const sort = (SORTS.find((item) => item.id === params.sort)?.id ?? "last") as CustomerSort;

  const list = await listCustomers({
    q,
    tag,
    sort,
    page: Number(params.page ?? 1),
    perPage: 20,
  });

  return (
    <Shell
      title="Гости"
      subtitle={`${list.total} ${list.total === 1 ? "номер" : "номеров"} в базе`}
    >
      <form
        method="get"
        action="/admin/customers"
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3"
      >
        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Поиск гостя</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Имя или телефон"
            className={INPUT_CLASS}
          />
        </label>

        <label>
          <span className="sr-only">Метка</span>
          <select name="tag" defaultValue={tag} className={SELECT_CLASS}>
            <option value="">Все метки</option>
            {CUSTOMER_TAGS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Сортировка</span>
          <select name="sort" defaultValue={sort} className={SELECT_CLASS}>
            {SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit">Показать</Button>

        {q || tag || sort !== "last" ? (
          <Link
            href="/admin/customers"
            className="px-3 py-2.5 text-sm text-ink-muted underline hover:text-ink"
          >
            Сбросить
          </Link>
        ) : null}
      </form>

      {list.customers.length === 0 ? (
        <Empty
          title="Ни одного гостя по этому фильтру"
          hint="Гость появляется в базе от первого заказа — с сайта, из телеграма или по телефону."
        />
      ) : (
        <>
          <ul className="space-y-3 sm:hidden">
            {list.customers.map((customer) => (
              <li key={customer.phone} className="rounded-2xl border border-line bg-white p-4">
                <Link
                  href={`/admin/customers/${encodeURIComponent(customer.phone)}`}
                  className="font-bold hover:text-accent hover:underline"
                >
                  {customer.name}
                </Link>
                <p className="text-xs tabular-nums text-ink-muted">
                  {formatPhone(customer.phone)}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span className="font-bold text-ink tabular-nums">
                    {customer.ordersCount} заказов
                  </span>
                  <span className="tabular-nums">{money(customer.spent)}</span>
                  {customer.lastOrderAt ? (
                    <span className="tabular-nums">{relative(customer.lastOrderAt)}</span>
                  ) : null}
                </div>
                {customer.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {customer.tags.map((id) => {
                      const meta = tagMeta(id);
                      return meta ? (
                        <span
                          key={id}
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${meta.pill}`}
                        >
                          {meta.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-line bg-white sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="bg-tint text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                    <th className="px-5 py-3">Гость</th>
                    <th className="px-3 py-3 text-right">Заказов</th>
                    <th className="px-3 py-3 text-right">Сумма</th>
                    <th className="px-3 py-3 text-right">Средний чек</th>
                    <th className="px-3 py-3">Последний</th>
                    <th className="px-5 py-3">Метки</th>
                  </tr>
                </thead>
                <tbody>
                  {list.customers.map((customer) => (
                    <tr key={customer.phone} className="border-t border-line hover:bg-tint/60">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/customers/${encodeURIComponent(customer.phone)}`}
                          className="font-semibold hover:text-accent hover:underline"
                        >
                          {customer.name}
                        </Link>
                        <p className="text-[11px] tabular-nums text-ink-muted">
                          {formatPhone(customer.phone)}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {customer.ordersCount}
                        {customer.cancelledCount > 0 ? (
                          <span className="text-[11px] text-ink-muted">
                            {" "}
                            +{customer.cancelledCount} отм.
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">
                        {money(customer.spent)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-soft">
                        {money(customer.avgCheck)}
                      </td>
                      <td className="px-3 py-3">
                        {customer.lastOrderAt ? (
                          <>
                            <p className="tabular-nums">{dayLabel(customer.lastOrderAt)}</p>
                            <p className="text-[11px] text-ink-muted">
                              {relative(customer.lastOrderAt)}
                            </p>
                          </>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.length === 0 ? (
                            <span className="text-[11px] text-ink-muted">—</span>
                          ) : (
                            customer.tags.map((id) => {
                              const meta = tagMeta(id);
                              return meta ? (
                                <span
                                  key={id}
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${meta.pill}`}
                                >
                                  {meta.label}
                                </span>
                              ) : null;
                            })
                          )}
                          {customer.notesCount > 0 ? (
                            <span className="rounded-full bg-tint px-2 py-0.5 text-[11px] text-ink-muted ring-1 ring-line">
                              {customer.notesCount} зам.
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {list.pages > 1 ? (
        <nav className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-3 text-sm">
          <span className="text-ink-muted">
            Страница {list.page} из {list.pages}
          </span>
          <span className="flex gap-2">
            {list.page > 1 ? (
              <Link
                href={`/admin/customers${buildQuery({ q, tag, sort, page: list.page - 1 })}`}
                className="rounded-xl bg-tint px-3 py-1.5 font-semibold transition hover:bg-line"
              >
                ← Назад
              </Link>
            ) : null}
            {list.page < list.pages ? (
              <Link
                href={`/admin/customers${buildQuery({ q, tag, sort, page: list.page + 1 })}`}
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
