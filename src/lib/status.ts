/**
 * Жизненный цикл заказа — единственное место, где он задан.
 * Его читают админка, API смены статуса и уведомления.
 *
 * Доставка:  новый → принят → готовится → в пути  → выдан
 * Самовывоз: новый → принят → готовится → готов   → выдан
 * Отменить можно с любого шага, кроме уже выданного.
 */

import type { Fulfillment } from "./order";

export const ORDER_STATUSES = [
  "new",
  "accepted",
  "cooking",
  "on_way",
  "ready",
  "done",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

type StatusMeta = {
  label: string;
  /** Короткая подпись для кнопки перехода: «Принять», «На кухню». */
  action: string;
  /** Классы пилюли статуса. Держим здесь, чтобы цвет статуса нигде не разъезжался. */
  pill: string;
  /** Точка для списков и легенд. */
  dot: string;
};

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  new: {
    label: "Новый",
    action: "Вернуть в новые",
    pill: "bg-warn-tint text-warn ring-warn/20",
    dot: "bg-warn",
  },
  accepted: {
    label: "Принят",
    action: "Принять",
    pill: "bg-gold-tint text-gold-ink ring-gold/25",
    dot: "bg-gold",
  },
  cooking: {
    label: "Готовится",
    action: "На кухню",
    pill: "bg-violet-tint text-violet-ink ring-violet/25",
    dot: "bg-violet",
  },
  on_way: {
    label: "В пути",
    action: "Курьер забрал",
    pill: "bg-blue-tint text-blue-ink ring-blue/25",
    dot: "bg-blue",
  },
  ready: {
    label: "Готов к выдаче",
    action: "Готов к выдаче",
    pill: "bg-blue-tint text-blue-ink ring-blue/25",
    dot: "bg-blue",
  },
  done: {
    label: "Выдан",
    action: "Выдан",
    pill: "bg-accent-tint text-accent-strong ring-accent/20",
    dot: "bg-accent",
  },
  cancelled: {
    label: "Отменён",
    action: "Отменить",
    pill: "bg-tint text-ink-muted ring-line",
    dot: "bg-ink-muted",
  },
};

/** Статусы, после которых заказ больше не живёт в работе. */
export const FINAL_STATUSES: OrderStatus[] = ["done", "cancelled"];

/**
 * Куда можно уйти со статуса. Шаг «в пути» существует только для доставки,
 * «готов к выдаче» — только для самовывоза: иначе менеджер отправит курьера
 * за заказом, который клиент забирает сам.
 */
export function nextStatuses(current: OrderStatus, fulfillment: Fulfillment): OrderStatus[] {
  const handoff: OrderStatus = fulfillment === "delivery" ? "on_way" : "ready";

  const flow: Record<OrderStatus, OrderStatus[]> = {
    new: ["accepted", "cancelled"],
    accepted: ["cooking", "cancelled"],
    cooking: [handoff, "cancelled"],
    on_way: ["done", "cancelled"],
    ready: ["done", "cancelled"],
    done: [],
    cancelled: ["new"],
  };

  return flow[current];
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  fulfillment: Fulfillment,
): boolean {
  return nextStatuses(from, fulfillment).includes(to);
}

/** Группы для вкладок в списке заказов. Одна вкладка — один вопрос менеджера к жизни. */
export const STATUS_GROUPS = [
  { id: "active", title: "В работе", statuses: ["new", "accepted", "cooking"] },
  { id: "new", title: "Новые", statuses: ["new"] },
  { id: "kitchen", title: "Готовятся", statuses: ["accepted", "cooking"] },
  { id: "handoff", title: "В пути и готовые", statuses: ["on_way", "ready"] },
  { id: "done", title: "Выданные", statuses: ["done"] },
  { id: "cancelled", title: "Отменённые", statuses: ["cancelled"] },
] as const satisfies readonly { id: string; title: string; statuses: readonly OrderStatus[] }[];

export type StatusGroupId = (typeof STATUS_GROUPS)[number]["id"];

export function statusGroup(id: string | undefined) {
  return STATUS_GROUPS.find((group) => group.id === id);
}
