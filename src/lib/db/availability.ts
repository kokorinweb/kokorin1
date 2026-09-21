/**
 * Стоп-лист: блюдо кончилось.
 *
 * Меню остаётся в коде — здесь только состояние вечера по id блюда. Это единственная
 * причина, по которой витрина, корзина, бот и ИИ ходят в базу за меню: цены и состав
 * по-прежнему приходят из MENU.
 */
import { getDb } from "./client";
import { getMenuItem } from "../menu";

export type StopEntry = { itemId: string; reason: string; updatedAt: Date };

/** id блюд, которых сейчас нет → причина (может быть пустой). */
export async function unavailableItems(): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db.query<{ item_id: string; reason: string }>(
    `select item_id, reason from menu_availability where available = false`,
  );
  return new Map(rows.map((row) => [row.item_id, row.reason]));
}

/**
 * То же, но не падает: витрина и бот не должны умирать из-за недоступной базы.
 * Пустой стоп-лист — безопасная деградация: гость увидит блюдо, менеджер по телефону
 * извинится. Обратная ошибка (спрятать всё меню) стоит дороже.
 */
export async function unavailableItemsSafe(): Promise<Map<string, string>> {
  try {
    return await unavailableItems();
  } catch (error) {
    console.warn("[availability] стоп-лист недоступен, считаем всё доступным:", error);
    return new Map();
  }
}

export async function setAvailability(
  itemId: string,
  available: boolean,
  reason: string,
): Promise<void> {
  if (!getMenuItem(itemId)) throw new Error(`Блюда «${itemId}» нет в меню`);

  const db = await getDb();
  await db.query(
    `insert into menu_availability (item_id, available, reason, updated_at)
     values ($1, $2, $3, now())
     on conflict (item_id) do update
       set available = excluded.available,
           reason = excluded.reason,
           updated_at = now()`,
    [itemId, available, available ? "" : reason],
  );
}

/** Полная картина для экрана стоп-листа: что выключено и когда трогали. */
export async function availabilityState(): Promise<Map<string, StopEntry & { available: boolean }>> {
  const db = await getDb();
  const rows = await db.query<{
    item_id: string;
    available: boolean;
    reason: string;
    updated_at: unknown;
  }>(`select item_id, available, reason, updated_at from menu_availability`);

  return new Map(
    rows.map((row) => [
      row.item_id,
      {
        itemId: row.item_id,
        available: row.available,
        reason: row.reason,
        updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(String(row.updated_at)),
      },
    ]),
  );
}
