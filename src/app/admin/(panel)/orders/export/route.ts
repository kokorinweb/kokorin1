import { currentSession } from "@/lib/auth";
import { listOrdersForExport } from "@/lib/db/orders";
import { STATUS_META } from "@/lib/status";
import { formatPhone } from "@/lib/phone";
import { RESTAURANT } from "@/lib/restaurant";
import type { Fulfillment } from "@/lib/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Выгрузка в CSV под русский Excel: разделитель — точка с запятой, в начале BOM.
 * Без этих двух деталей Excel открывает файл одной колонкой и с кракозябрами.
 *
 * Обработчики маршрутов не проходят через layout, поэтому сессию проверяем здесь.
 */
/**
 * Дата для Excel: местное время заведения в привычном виде.
 * ISO-строка с Z в выгрузке бесполезна — её никто не читает, и она в UTC,
 * то есть на три часа расходится с тем, что видел менеджер в админке.
 */
const DATE = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: RESTAURANT.timezone,
});

function escape(value: string | number): string {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  if (!(await currentSession())) {
    return new Response("Нужен вход в админку", { status: 401 });
  }

  const url = new URL(request.url);
  const fulfillmentParam = url.searchParams.get("fulfillment");
  const fulfillment: Fulfillment | undefined =
    fulfillmentParam === "delivery" || fulfillmentParam === "pickup" ? fulfillmentParam : undefined;

  const orders = await listOrdersForExport({
    group: url.searchParams.get("group") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    fulfillment,
  });

  const header = [
    "Номер",
    "Дата",
    "Статус",
    "Способ",
    "Гость",
    "Телефон",
    "Адрес",
    "Позиций",
    "Сумма позиций",
    "Скидка",
    "Доставка",
    "Итого",
    "Источник",
    "Комментарий",
  ];

  const rows = orders.map((order) => [
    order.number,
    DATE.format(order.createdAt).replace(", ", " "),
    STATUS_META[order.status].label,
    order.fulfillment === "delivery" ? "Доставка" : "Самовывоз",
    order.customerName,
    formatPhone(order.customerPhone),
    order.address,
    order.itemsCount,
    order.subtotal,
    order.discount,
    order.deliveryFee,
    order.total,
    order.source === "telegram" ? "Телеграм" : "Сайт",
    order.comment,
  ]);

  const csv = [header, ...rows].map((row) => row.map(escape).join(";")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="orders-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
