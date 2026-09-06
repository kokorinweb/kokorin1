import { z } from "zod";
import { getMenuItem, type MenuItem } from "./menu";
import { RESTAURANT } from "./restaurant";

/**
 * Клиент присылает только id блюда и количество.
 * Цены НИКОГДА не приходят с фронта — их подставляет сервер из MENU.
 * Иначе любой желающий закажет оссобуко за рубль через DevTools.
 */
export const orderLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const fulfillmentSchema = z.enum(["delivery", "pickup"]);

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
  address: z.string().trim().max(200).optional().default(""),
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
  deliveryFee: number;
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

  const discount =
    fulfillment === "pickup"
      ? Math.round((subtotal * RESTAURANT.pickup.discountPercent) / 100)
      : 0;

  const deliveryFee =
    fulfillment === "delivery" && subtotal > 0 && subtotal < RESTAURANT.delivery.freeFrom
      ? RESTAURANT.delivery.fee
      : 0;

  return {
    lines: priced,
    subtotal,
    discount,
    deliveryFee,
    total: subtotal - discount + deliveryFee,
    fulfillment,
    etaMinutes:
      fulfillment === "delivery"
        ? RESTAURANT.delivery.etaMinutes
        : RESTAURANT.pickup.etaMinutes,
  };
}

/** То же самое, но с проверкой правил оформления. Используется только на сервере. */
export function priceOrder(
  lines: { itemId: string; quantity: number }[],
  fulfillment: Fulfillment,
): PricedOrder {
  const quote = quoteOrder(lines, fulfillment);

  if (fulfillment === "delivery" && quote.subtotal < RESTAURANT.delivery.minOrder) {
    throw new OrderError(
      `Минимальная сумма заказа на доставку — ${RESTAURANT.delivery.minOrder} ₽`,
    );
  }

  return quote;
}

/** Короткий читаемый номер заказа: BEL-8F3K2. */
export function makeOrderNumber(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  for (let i = 0; i < 5; i += 1) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BEL-${tail}`;
}
