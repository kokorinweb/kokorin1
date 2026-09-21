import { CATEGORIES, MENU, formatPrice } from "@/lib/menu";
import { availabilityState } from "@/lib/db/availability";
import { Shell } from "@/components/admin/Shell";
import { Card, CardHead } from "@/components/admin/ui";
import { StopListToggle } from "@/components/admin/StopListToggle";
import { moment } from "@/components/admin/format";

export const dynamic = "force-dynamic";

/**
 * Стоп-лист.
 *
 * Меню правится в коде и деплоем — это принцип проекта, и здесь он не нарушается:
 * на этом экране нельзя переименовать блюдо или поменять цену, только сказать, что
 * его сегодня нет. Выключенное блюдо тут же исчезает из корзины, из ответов бота и
 * из того, что предлагает ИИ-консультант.
 */
export default async function StopListPage() {
  const state = await availabilityState();
  const stopped = MENU.filter((item) => state.get(item.id)?.available === false);

  return (
    <Shell
      title="Стоп-лист"
      subtitle={
        stopped.length > 0
          ? `${stopped.length} ${stopped.length === 1 ? "блюдо" : "блюд"} выключено из меню`
          : "всё меню доступно"
      }
    >
      {stopped.length > 0 ? (
        <Card className="border-warn/25 bg-warn-tint">
          <CardHead title="Сейчас нет" hint="гость видит пометку, ИИ и бот их не предлагают" />
          <ul className="mt-3 flex flex-wrap gap-2">
            {stopped.map((item) => {
              const entry = state.get(item.id);
              return (
                <li
                  key={item.id}
                  className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-warn"
                >
                  {item.name}
                  {entry?.reason ? (
                    <span className="ml-1.5 font-normal text-ink-muted">· {entry.reason}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {CATEGORIES.map((category) => {
        const items = MENU.filter((item) => item.category === category.id);
        if (items.length === 0) return null;

        return (
          <Card key={category.id} padded={false} className="overflow-hidden">
            <div className="p-5 pb-3">
              <CardHead title={category.subtitle} hint={category.title} />
            </div>

            <ul>
              {items.map((item) => {
                const entry = state.get(item.id);
                const available = entry?.available !== false;

                return (
                  <li
                    key={item.id}
                    className={`flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 ${
                      available ? "" : "bg-warn-tint/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`font-semibold ${available ? "" : "text-warn"}`}>
                        {item.name}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {formatPrice(item.price)} · {item.portion}
                        {entry && !available && entry.updatedAt
                          ? ` · выключено ${moment(entry.updatedAt)}`
                          : ""}
                      </p>
                    </div>

                    <StopListToggle
                      itemId={item.id}
                      itemName={item.name}
                      available={available}
                      reason={entry?.reason ?? ""}
                    />
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </Shell>
  );
}
