import { z } from "zod";
import { getMenuItem, type MenuItem } from "./menu";
import { RESTAURANT } from "./restaurant";
import { findBooking, serveTimes } from "./booking";

/**
 * Клиент присылает только id блюда и количество.
 * Цены НИКОГДА не приходят с фронта — их подставляет сервер из MENU.
 * Иначе любой желающий закажет сет за рубль через DevTools.
 */
export const orderLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

/** Два сценария из ТЗ: забрать с собой или подать к забронированному столику. */
export const fulfillmentSchema = z.enum(["pickup", "table"]);

export const orderSchema = z.object({
  lines: z.array(orderLineSchema).min(1, "Корзина пуста").max(40),
  fulfillment: fulfillmentSchema,
  name: z.string().trim().min(2, "Укажите имя").max(60),
  phone: z
    .string()
    .trim()
    .min(10, "Укажите телефон")
    .max(20)
    .regex(/^[+\d][\d\s()\-]+$/, "Телефон выглядит некорректно"),
  /** Самовывоз: во сколько гость заедет. */
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  /** К столику: код брони и время подачи. */
  bookingCode: z.string().trim().max(20).optional(),
  serveTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  comment: z.string().trim().max(500).optional().default(""),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type Fulfillment = z.infer<typeof fulfillmentSchema>;

export type PricedLine = {
  item: MenuItem;
  quantity: number;
  lineTotal: number;
};

export type PricedOrder = {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  total: number;
  fulfillment: Fulfillment;
  etaMinutes: number;
};

export class OrderError extends Error {}

/**
 * Считает суммы по серверным ценам и правилам заведения.
 * Ничего не валидирует — используется и на клиенте для витрины корзины.
 */
export function quoteOrder(
  lines: { itemId: string; quantity: number }[],
  fulfillment: Fulfillment,
): PricedOrder {
  const priced: PricedLine[] = [];

  for (const line of lines) {
    const item = getMenuItem(line.itemId);
    if (!item) {
      throw new OrderError(`Блюда «${line.itemId}» нет в меню`);
    }
    priced.push({ item, quantity: line.quantity, lineTotal: item.price * line.quantity });
  }

  const subtotal = priced.reduce((sum, line) => sum + line.lineTotal, 0);

  // Скидка только за самовывоз: за столиком её быть не должно, это другая экономика.
  const discount =
    fulfillment === "pickup"
      ? Math.round((subtotal * RESTAURANT.pickup.discountPercent) / 100)
      : 0;

  return {
    lines: priced,
    subtotal,
    discount,
    total: subtotal - discount,
    fulfillment,
    etaMinutes: RESTAURANT.pickup.etaMinutes,
  };
}

/** То же самое, но с проверкой правил оформления. Используется только на сервере. */
export function priceOrder(input: OrderInput): PricedOrder {
  const quote = quoteOrder(input.lines, input.fulfillment);

  if (input.fulfillment === "pickup") {
    if (!input.pickupTime) {
      throw new OrderError("Укажите, во сколько заберёте заказ");
    }
    return quote;
  }

  // Заказ к столику существует только рядом с бронью — иначе некуда подавать.
  const code = input.bookingCode?.trim().toUpperCase() ?? "";
  if (!code) {
    throw new OrderError("Укажите код брони — заказ подаём к забронированному столику");
  }

  const booking = findBooking(code);
  if (!booking) {
    throw new OrderError(
      `Бронь ${code} не найдена. Проверьте код или позвоните: ${RESTAURANT.phone}`,
    );
  }

  if (!input.serveTime) {
    throw new OrderError("Выберите время подачи");
  }
  if (!serveTimes(booking.slot).includes(input.serveTime)) {
    throw new OrderError("Это время подачи не подходит к вашей броне");
  }

  return quote;
}

/** Короткий читаемый номер заказа: NORI-8F3K2. */
export function makeOrderNumber(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  for (let index = 0; index < 5; index += 1) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `N-${tail}`;
}
