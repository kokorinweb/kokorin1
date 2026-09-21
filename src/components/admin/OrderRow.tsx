"use client";

import Link from "next/link";
import { useState } from "react";
import type { Order } from "@/lib/db/orders";
import { sourceLabel } from "@/lib/order";
import { StatusControl } from "./StatusControl";
import { money, moment, relative } from "./format";
import { formatPhone } from "@/lib/phone";

/**
 * Строка стола заказов. Клиентская не ради интерактива в вёрстке, а ради одного
 * авторского момента: после смены статуса строка коротко подсвечивается, чтобы
 * глаз нашёл её в таблице из пятнадцати строк, не перечитывая заново.
 */
export function OrderRow({ order }: { order: Order }) {
  const [touched, setTouched] = useState(false);

  function flash() {
    setTouched(true);
    window.setTimeout(() => setTouched(false), 1500);
  }

  return (
    <tr className={`border-t border-line transition hover:bg-tint/60 ${touched ? "admin-touched" : ""}`}>
      <td className="px-5 py-3">
        <Link
          href={`/admin/orders/${order.number}`}
          className="font-bold tabular-nums hover:text-accent hover:underline"
        >
          {order.number}
        </Link>
        <p className="text-[11px] text-ink-muted">{sourceLabel(order.source)}</p>
      </td>

      <td className="px-3 py-3">
        <Link
          href={`/admin/customers/${encodeURIComponent(order.customerPhone)}`}
          className="font-semibold hover:text-accent hover:underline"
        >
          {order.customerName}
        </Link>
        <p className="text-[11px] tabular-nums text-ink-muted">{formatPhone(order.customerPhone)}</p>
      </td>

      <td className="px-3 py-3 text-right tabular-nums">{order.itemsCount}</td>

      <td className="px-3 py-3 text-right font-bold tabular-nums">{money(order.total)}</td>

      <td className="px-3 py-3">
        <p className="tabular-nums">{moment(order.createdAt)}</p>
        <p className="text-[11px] text-ink-muted">{relative(order.createdAt)}</p>
      </td>

      <td className="px-3 py-3 text-ink-soft">
        {order.fulfillment === "delivery" ? "Доставка" : "Самовывоз"}
      </td>

      <td className="px-3 py-3">
        <StatusControl
          number={order.number}
          status={order.status}
          fulfillment={order.fulfillment}
          onChanged={flash}
        />
      </td>

      <td className="px-5 py-3 text-right">
        <Link
          href={`/admin/orders/${order.number}`}
          aria-label={`Открыть заказ ${order.number}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-tint hover:text-ink"
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
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </td>
    </tr>
  );
}

/** Та же строка карточкой: на телефоне статус не должен уезжать за край экрана. */
export function OrderCard({ order }: { order: Order }) {
  const [touched, setTouched] = useState(false);

  return (
    <li
      className={`rounded-2xl border border-line bg-white p-4 ${touched ? "admin-touched" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/orders/${order.number}`}
            className="font-bold tabular-nums hover:text-accent hover:underline"
          >
            {order.number}
          </Link>
          <p className="truncate text-sm">{order.customerName}</p>
          <p className="text-xs tabular-nums text-ink-muted">{formatPhone(order.customerPhone)}</p>
        </div>
        <StatusControl
          number={order.number}
          status={order.status}
          fulfillment={order.fulfillment}
          onChanged={() => {
            setTouched(true);
            window.setTimeout(() => setTouched(false), 1500);
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span className="font-bold text-ink tabular-nums">{money(order.total)}</span>
        <span>{order.itemsCount} поз.</span>
        <span>{order.fulfillment === "delivery" ? "доставка" : "самовывоз"}</span>
        <span className="tabular-nums">{relative(order.createdAt)}</span>
      </div>
    </li>
  );
}
