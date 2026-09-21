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
    pill: "bg-terracotta/10 text-terracotta ring-terracotta/20",
    dot: "bg-terracotta",
  },
  accepted: {
    label: "Принят",
    action: "Принять",
    pill: "bg-gold/15 text-[#8a6316] ring-gold/30",
    dot: "bg-gold",
  },
  cooking: {
    label: "Готовится",
    action: "На кухню",
    pill: "bg-[#e8dff5] text-[#5b3f8a] ring-[#c9b4e6]",
    dot: "bg-[#7c5cb8]",
  },
  on_way: {
    label: "В пути",
    action: "Курьер забрал",
    pill: "bg-[#dce9f7] text-[#1f5580] ring-[#b6d2ec]",
    dot: "bg-[#2f7ec2]",
  },
  ready: {
    label: "Готов к выдаче",
    action: "Готов к выдаче",
    pill: "bg-[#dce9f7] text-[#1f5580] ring-[#b6d2ec]",
    dot: "bg-[#2f7ec2]",
  },
  done: {
    label: "Выдан",
    action: "Выдан",
    pill: "bg-basil/10 text-basil ring-basil/20",
    dot: "bg-basil",
  },
  cancelled: {
    label: "Отменён",
    action: "Отменить",
    pill: "bg-ink/5 text-ink-soft ring-ink/10",
    dot: "bg-ink-soft",
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
