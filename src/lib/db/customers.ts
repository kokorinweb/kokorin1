/**
 * Гости. Отдельной регистрации нет: клиент появляется от первого заказа, ключ —
 * нормализованный телефон (src/lib/phone.ts).
 *
 * Метрики считаются запросом, а не хранятся в колонках: денормализация здесь дала бы
 * ровно один выигрыш — скорость на объёме, которого у одного ресторана не будет, — и
 * взамен вечный риск расхождения счётчика с заказами.
 */
import { getDb, toDate } from "./client";
import { isCustomerTag } from "../tags";
import type { Order } from "./orders";
import { listOrders } from "./orders";

export type Customer = {
  phone: string;
  name: string;
  ordersCount: number;
  cancelledCount: number;
  spent: number;
  avgCheck: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  tags: string[];
  notesCount: number;
};

export type CustomerNote = { id: number; text: string; createdAt: Date };

export type FavouriteDish = { itemName: string; quantity: number; lastAt: Date };

type CustomerDbRow = {
  phone: string;
  name: string;
  orders_count: number;
  cancelled_count: number;
  spent: number;
  first_order_at: unknown;
  last_order_at: unknown;
  notes_count: number;
};

function mapCustomer(row: CustomerDbRow, tags: string[]): Customer {
  return {
    phone: row.phone,
    name: row.name,
    ordersCount: row.orders_count,
    cancelledCount: row.cancelled_count,
    spent: row.spent,
    avgCheck: row.orders_count > 0 ? Math.round(row.spent / row.orders_count) : 0,
    firstOrderAt: row.first_order_at ? toDate(row.first_order_at) : null,
    lastOrderAt: row.last_order_at ? toDate(row.last_order_at) : null,
    tags,
    notesCount: row.notes_count,
  };
}

const CUSTOMER_SELECT = `
  select
    c.phone,
    c.name,
    count(o.id) filter (where o.status <> 'cancelled')::int                as orders_count,
    count(o.id) filter (where o.status = 'cancelled')::int                as cancelled_count,
    coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::int  as spent,
    min(o.created_at) filter (where o.status <> 'cancelled')              as first_order_at,
    max(o.created_at) filter (where o.status <> 'cancelled')              as last_order_at,
    (select count(*)::int from customer_notes n where n.phone = c.phone)  as notes_count
  from customers c
  left join orders o on o.customer_phone = c.phone
`;

export type CustomerSort = "last" | "orders" | "spent" | "name";

const ORDER_BY: Record<CustomerSort, string> = {
  last: "last_order_at desc nulls last",
  orders: "orders_count desc",
  spent: "spent desc",
  name: "c.name asc",
};

export type CustomerListResult = {
  customers: Customer[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
};

export async function listCustomers(
  filters: { q?: string; tag?: string; sort?: CustomerSort; page?: number; perPage?: number } = {},
): Promise<CustomerListResult> {
  const db = await getDb();
  const perPage = Math.min(Math.max(filters.perPage ?? 20, 5), 100);
  const sort = ORDER_BY[filters.sort ?? "last"] ?? ORDER_BY.last;

  const clauses: string[] = [];
  const params: unknown[] = [];

  const q = filters.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    params.push(`%${q}%`);
    if (digits.length >= 3) {
      params.push(`%${digits}%`);
      clauses.push(`(c.name ilike $${params.length - 1} or c.phone like $${params.length})`);
    } else {
      clauses.push(`c.name ilike $${params.length}`);
    }
  }

  if (filters.tag && isCustomerTag(filters.tag)) {
    params.push(filters.tag);
    clauses.push(
      `exists (select 1 from customer_tags t where t.phone = c.phone and t.tag = $${params.length})`,
    );
  }

  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";

  const [counted] = await db.query<{ total: number }>(
    `select count(*)::int as total from customers c ${where}`,
    params,
  );
  const total = counted?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(filters.page ?? 1, 1), pages);

  const rows = await db.query<CustomerDbRow>(
    `${CUSTOMER_SELECT} ${where}
     group by c.phone, c.name
     order by ${sort}
     limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, perPage, (page - 1) * perPage],
  );

  const tags = await tagsFor(rows.map((row) => row.phone));

  return {
    customers: rows.map((row) => mapCustomer(row, tags.get(row.phone) ?? [])),
    total,
    page,
    perPage,
    pages,
  };
}

async function tagsFor(phones: string[]): Promise<Map<string, string[]>> {
  if (phones.length === 0) return new Map();
  const db = await getDb();
  const rows = await db.query<{ phone: string; tag: string }>(
    `select phone, tag from customer_tags where phone = any($1) order by created_at`,
    [phones],
  );

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.phone) ?? [];
    list.push(row.tag);
    map.set(row.phone, list);
  }
  return map;
}

export type CustomerCard = {
  customer: Customer;
  orders: Order[];
  favourites: FavouriteDish[];
  notes: CustomerNote[];
};

export async function getCustomer(phone: string): Promise<CustomerCard | null> {
  const db = await getDb();

  const [row] = await db.query<CustomerDbRow>(
    `${CUSTOMER_SELECT} where c.phone = $1 group by c.phone, c.name`,
    [phone],
  );
  if (!row) return null;

  const [tags, favourites, notes, orders] = await Promise.all([
    tagsFor([phone]),
    db.query<{ item_name: string; quantity: number; last_at: unknown }>(
      `select l.item_name, sum(l.quantity)::int as quantity, max(o.created_at) as last_at
       from order_lines l
       join orders o on o.id = l.order_id
       where o.customer_phone = $1 and o.status <> 'cancelled'
       group by l.item_name
       order by quantity desc, last_at desc
       limit 5`,
      [phone],
    ),
    db.query<{ id: number; text: string; created_at: unknown }>(
      `select id, text, created_at from customer_notes where phone = $1 order by created_at desc`,
      [phone],
    ),
    listOrders({ phone, perPage: 50 }),
  ]);

  return {
    customer: mapCustomer(row, tags.get(phone) ?? []),
    orders: orders.orders,
    favourites: favourites.map((dish) => ({
      itemName: dish.item_name,
      quantity: dish.quantity,
      lastAt: toDate(dish.last_at),
    })),
    notes: notes.map((note) => ({
      id: note.id,
      text: note.text,
      createdAt: toDate(note.created_at),
    })),
  };
}

export async function addCustomerNote(phone: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const db = await getDb();
  await db.query(`insert into customer_notes (phone, text) values ($1, $2)`, [
    phone,
    trimmed.slice(0, 600),
  ]);
}

export async function deleteCustomerNote(id: number): Promise<void> {
  const db = await getDb();
  await db.query(`delete from customer_notes where id = $1`, [id]);
}

export async function setCustomerTag(phone: string, tag: string, on: boolean): Promise<void> {
  if (!isCustomerTag(tag)) throw new Error(`Неизвестная метка «${tag}»`);

  const db = await getDb();
  if (on) {
    await db.query(
      `insert into customer_tags (phone, tag) values ($1, $2) on conflict do nothing`,
      [phone, tag],
    );
  } else {
    await db.query(`delete from customer_tags where phone = $1 and tag = $2`, [phone, tag]);
  }
}

/** Краткая справка для экрана нового заказа: кто звонит. */
export async function customerBrief(
  phone: string,
): Promise<{ name: string; ordersCount: number; lastOrderAt: Date | null; tags: string[] } | null> {
  const db = await getDb();
  const [row] = await db.query<CustomerDbRow>(
    `${CUSTOMER_SELECT} where c.phone = $1 group by c.phone, c.name`,
    [phone],
  );
  if (!row) return null;

  const tags = await tagsFor([phone]);
  return {
    name: row.name,
    ordersCount: row.orders_count,
    lastOrderAt: row.last_order_at ? toDate(row.last_order_at) : null,
    tags: tags.get(phone) ?? [],
  };
}
