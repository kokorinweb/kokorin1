/**
 * Все запросы по заказам. Выше этого файла SQL не поднимается:
 * страницы админки и API-роуты работают только с функциями отсюда.
 */
import { getDb, isUniqueViolation, toDate } from "./client";
import {
  SOURCE_LABEL,
  makeOrderNumber,
  type Fulfillment,
  type OrderInput,
  type OrderSource,
  type PricedOrder,
} from "../order";
import { canTransition, isOrderStatus, statusGroup, type OrderStatus } from "../status";
import { normalizePhone } from "../phone";

export type Order = {
  id: number;
  number: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  source: string;
  customerName: string;
  customerPhone: string;
  address: string;
  comment: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  etaMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  /** Сколько блюд в заказе — суммарное количество, а не число строк. */
  itemsCount: number;
};

export type OrderLine = {
  itemId: string;
  itemName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderEvent = {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actor: string;
  createdAt: Date;
};

type OrderDbRow = {
  id: number;
  number: string;
  status: string;
  fulfillment: string;
  source: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  comment: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  eta_minutes: number;
  created_at: unknown;
  updated_at: unknown;
  items_count: number;
};

function mapOrder(row: OrderDbRow): Order {
  return {
    id: row.id,
    number: row.number,
    status: isOrderStatus(row.status) ? row.status : "new",
    fulfillment: row.fulfillment === "pickup" ? "pickup" : "delivery",
    source: row.source,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    address: row.address,
    comment: row.comment,
    subtotal: row.subtotal,
    discount: row.discount,
    deliveryFee: row.delivery_fee,
    total: row.total,
    etaMinutes: row.eta_minutes,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    itemsCount: Number(row.items_count ?? 0),
  };
}

const LIST_SELECT = `
  select o.*, coalesce(l.items, 0)::int as items_count
  from orders o
  left join (
    select order_id, sum(quantity)::int as items
    from order_lines
    group by order_id
  ) l on l.order_id = o.id
`;

/**
 * Пишет заказ в базу: клиента, сам заказ, снапшот строк и первое событие — одной транзакцией.
 * Номер генерируется здесь же; при попадании в уже занятый пробуем ещё раз.
 */
export async function createOrder(params: {
  input: OrderInput;
  priced: PricedOrder;
  source?: OrderSource;
  /** Только для сида демо-данных: реальный заказ всегда создаётся «сейчас». */
  createdAt?: Date;
  status?: OrderStatus;
}): Promise<Order> {
  const db = await getDb();
  const { input, priced } = params;
  const phone = normalizePhone(input.phone);
  const source: OrderSource = params.source ?? "site";
  const status = params.status ?? "new";
  const createdAt = params.createdAt ?? new Date();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const number = makeOrderNumber();

    try {
      return await db.transaction(async (tx) => {
        await tx.query(
          `insert into customers (phone, name, created_at, last_order_at)
           values ($1, $2, $3, $3)
           on conflict (phone) do update
             set name = excluded.name,
                 created_at = least(customers.created_at, excluded.created_at),
                 last_order_at = greatest(coalesce(customers.last_order_at, excluded.last_order_at), excluded.last_order_at)`,
          [phone, input.name, createdAt],
        );

        const [order] = await tx.query<{ id: number }>(
          `insert into orders (
             number, status, fulfillment, source, customer_phone, customer_name,
             address, comment, subtotal, discount, delivery_fee, total, eta_minutes,
             created_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
           returning id`,
          [
            number,
            status,
            priced.fulfillment,
            source,
            phone,
            input.name,
            input.address,
            input.comment,
            priced.subtotal,
            priced.discount,
            priced.deliveryFee,
            priced.total,
            priced.etaMinutes,
            createdAt,
          ],
        );

        const orderId = order!.id;

        for (const line of priced.lines) {
          await tx.query(
            `insert into order_lines (order_id, item_id, item_name, category, unit_price, quantity, line_total)
             values ($1,$2,$3,$4,$5,$6,$7)`,
            [
              orderId,
              line.item.id,
              line.item.name,
              line.item.category,
              line.item.price,
              line.quantity,
              line.lineTotal,
            ],
          );
        }

        await tx.query(
          `insert into order_events (order_id, from_status, to_status, actor, created_at)
           values ($1, null, $2, $3, $4)`,
          [orderId, status, SOURCE_LABEL[source], createdAt],
        );

        const [row] = await tx.query<OrderDbRow>(`${LIST_SELECT} where o.id = $1`, [orderId]);
        return mapOrder(row!);
      });
    } catch (error) {
      // Номер из 5 символов иногда повторяется — просто берём следующий.
      if (isUniqueViolation(error) && attempt < 4) continue;
      throw error;
    }
  }

  throw new Error("Не удалось подобрать свободный номер заказа");
}

export type OrderListFilters = {
  group?: string;
  /** Номер заказа, имя или телефон — одно поле поиска. */
  q?: string;
  fulfillment?: Fulfillment;
  /** Все заказы одного гостя — для его карточки. */
  phone?: string;
  source?: OrderSource;
  page?: number;
  perPage?: number;
};

export type OrderListResult = {
  orders: Order[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
};

function buildWhere(filters: OrderListFilters): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  const group = statusGroup(filters.group);
  if (group) {
    params.push([...group.statuses]);
    clauses.push(`o.status = any($${params.length})`);
  }

  if (filters.fulfillment) {
    params.push(filters.fulfillment);
    clauses.push(`o.fulfillment = $${params.length}`);
  }

  if (filters.phone) {
    params.push(filters.phone);
    clauses.push(`o.customer_phone = $${params.length}`);
  }

  if (filters.source) {
    params.push(filters.source);
    clauses.push(`o.source = $${params.length}`);
  }

  const q = filters.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    params.push(`%${q}%`);
    const like = `$${params.length}`;
    if (digits.length >= 3) {
      params.push(`%${digits}%`);
      clauses.push(
        `(o.number ilike ${like} or o.customer_name ilike ${like} or o.customer_phone like $${params.length})`,
      );
    } else {
      clauses.push(`(o.number ilike ${like} or o.customer_name ilike ${like})`);
    }
  }

  return { sql: clauses.length ? `where ${clauses.join(" and ")}` : "", params };
}

export async function listOrders(filters: OrderListFilters = {}): Promise<OrderListResult> {
  const db = await getDb();
  const perPage = Math.min(Math.max(filters.perPage ?? 20, 5), 100);
  const where = buildWhere(filters);

  const [counted] = await db.query<{ total: number }>(
    `select count(*)::int as total from orders o ${where.sql}`,
    where.params,
  );
  const total = counted?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(filters.page ?? 1, 1), pages);

  const rows = await db.query<OrderDbRow>(
    `${LIST_SELECT} ${where.sql} order by o.created_at desc limit $${where.params.length + 1} offset $${where.params.length + 2}`,
    [...where.params, perPage, (page - 1) * perPage],
  );

  return { orders: rows.map(mapOrder), total, page, perPage, pages };
}

/** Тот же фильтр, но без пагинации — для выгрузки в CSV. */
export async function listOrdersForExport(filters: OrderListFilters = {}): Promise<Order[]> {
  const db = await getDb();
  const where = buildWhere(filters);
  const rows = await db.query<OrderDbRow>(
    `${LIST_SELECT} ${where.sql} order by o.created_at desc limit 5000`,
    where.params,
  );
  return rows.map(mapOrder);
}

export async function getOrder(
  number: string,
): Promise<{ order: Order; lines: OrderLine[]; events: OrderEvent[] } | null> {
  const db = await getDb();

  const [row] = await db.query<OrderDbRow>(`${LIST_SELECT} where o.number = $1`, [
    number.toUpperCase(),
  ]);
  if (!row) return null;

  const lines = await db.query<{
    item_id: string;
    item_name: string;
    category: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>(
    `select item_id, item_name, category, unit_price, quantity, line_total
     from order_lines where order_id = $1 order by id`,
    [row.id],
  );

  const events = await db.query<{
    from_status: string | null;
    to_status: string;
    actor: string;
    created_at: unknown;
  }>(
    `select from_status, to_status, actor, created_at
     from order_events where order_id = $1 order by created_at, id`,
    [row.id],
  );

  return {
    order: mapOrder(row),
    lines: lines.map((line) => ({
      itemId: line.item_id,
      itemName: line.item_name,
      category: line.category,
      unitPrice: line.unit_price,
      quantity: line.quantity,
      lineTotal: line.line_total,
    })),
    events: events.map((event) => ({
      fromStatus:
        event.from_status && isOrderStatus(event.from_status) ? event.from_status : null,
      toStatus: isOrderStatus(event.to_status) ? event.to_status : "new",
      actor: event.actor,
      createdAt: toDate(event.created_at),
    })),
  };
}

export class StatusError extends Error {}

/**
 * Меняет статус с проверкой перехода. Переход проверяется в базе, а не на клиенте:
 * иначе двое менеджеров из двух вкладок переведут заказ по двум разным путям.
 */
export async function setOrderStatus(
  number: string,
  to: OrderStatus,
  actor: string,
): Promise<Order> {
  const db = await getDb();

  return db.transaction(async (tx) => {
    const [current] = await tx.query<{ id: number; status: string; fulfillment: string }>(
      `select id, status, fulfillment from orders where number = $1 for update`,
      [number.toUpperCase()],
    );

    if (!current) throw new StatusError(`Заказ ${number} не найден`);

    const from = isOrderStatus(current.status) ? current.status : "new";
    const fulfillment: Fulfillment = current.fulfillment === "pickup" ? "pickup" : "delivery";

    if (from === to) {
      const [row] = await tx.query<OrderDbRow>(`${LIST_SELECT} where o.id = $1`, [current.id]);
      return mapOrder(row!);
    }

    if (!canTransition(from, to, fulfillment)) {
      throw new StatusError(`Из «${from}» нельзя перейти в «${to}»`);
    }

    await tx.query(`update orders set status = $1, updated_at = now() where id = $2`, [
      to,
      current.id,
    ]);
    await tx.query(
      `insert into order_events (order_id, from_status, to_status, actor) values ($1,$2,$3,$4)`,
      [current.id, from, to, actor],
    );

    const [row] = await tx.query<OrderDbRow>(`${LIST_SELECT} where o.id = $1`, [current.id]);
    return mapOrder(row!);
  });
}

/** Сколько заказов в каждом статусе — для вкладок и плиток. */
export async function statusCounts(): Promise<Record<OrderStatus, number>> {
  const db = await getDb();
  const rows = await db.query<{ status: string; count: number }>(
    `select status, count(*)::int as count from orders group by status`,
  );

  const counts = {
    new: 0,
    accepted: 0,
    cooking: 0,
    on_way: 0,
    ready: 0,
    done: 0,
    cancelled: 0,
  } satisfies Record<OrderStatus, number>;

  for (const row of rows) {
    if (isOrderStatus(row.status)) counts[row.status] = row.count;
  }

  return counts;
}
