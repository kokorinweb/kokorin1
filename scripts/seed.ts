/**
 * Демо-данные для CRM: npm run db:seed
 *
 * Генерирует заказы за последние 60 дней, чтобы дашборд показывал графики,
 * а не пустые оси. Распределение нарочно неровное: пятница и суббота шумнее
 * будней, вечер — шумнее дня, часть заказов отменена, часть клиентов
 * возвращается. Ровный синтетический шум выглядит как ошибка в запросе.
 *
 * Скрипт НЕ выдумывает цены: суммы считает тот же priceOrder, что и сайт.
 */
import { MENU } from "../src/lib/menu";
import { OrderError, priceOrder, type Fulfillment, type OrderInput } from "../src/lib/order";
import { createOrder } from "../src/lib/db/orders";
import { getDb } from "../src/lib/db/client";
import { normalizePhone } from "../src/lib/phone";
import type { OrderStatus } from "../src/lib/status";
import { CUSTOMER_TAGS } from "../src/lib/tags";
import { RESERVATION_AREAS } from "../src/lib/reservation";

const DAYS = 60;
const RESTAURANT_TZ = process.env.RESTAURANT_TZ ?? "Europe/Moscow";

/*
 * Имена и фамилии согласованы по роду: иначе генератор выдаёт «Юлия Ваулин»,
 * и демо-данные сразу выглядят как демо-данные.
 */
const MEN_FIRST = [
  "Дмитрий", "Иван", "Никита", "Павел", "Артём", "Роман", "Сергей", "Максим",
  "Андрей", "Георгий", "Тимур", "Кирилл", "Эдуард", "Денис", "Валентин",
];

const MEN_LAST = [
  "Орлов", "Пахомов", "Ерёмин", "Дорохов", "Савельев", "Кузьмин", "Балакин",
  "Зуев", "Шульга", "Асланян", "Ваулин", "Ушаков", "Шахов", "Мельник", "Ким",
];

const WOMEN_FIRST = [
  "Анна", "Мария", "Ольга", "Светлана", "Екатерина", "Юлия", "Татьяна", "Алина",
  "Ксения", "Полина", "Вера", "Лидия", "Надежда", "Марина", "Алёна",
];

const WOMEN_LAST = [
  "Ковалёва", "Сергеева", "Тимофеева", "Гущина", "Лапина", "Белова", "Нечаева",
  "Фомина", "Радченко", "Юдина", "Прокопьева", "Соболева", "Гордеева", "Мельник",
  "Ким",
];

/** Постоянные гости: их индексы выпадают чаще остальных. */
const REGULARS = 8;
const GUEST_POOL = 140;

function guestName(index: number): string {
  const nth = index >> 1;
  return index % 2 === 0
    ? `${MEN_FIRST[nth % MEN_FIRST.length]} ${MEN_LAST[(nth * 5 + 1) % MEN_LAST.length]}`
    : `${WOMEN_FIRST[nth % WOMEN_FIRST.length]} ${WOMEN_LAST[(nth * 5 + 1) % WOMEN_LAST.length]}`;
}

const STREETS = [
  "Большая Никитская", "Малая Бронная", "Поварская", "Спиридоновка", "Сивцев Вражек",
  "Пречистенка", "Остоженка", "Тверской бульвар", "Патриарший переулок", "Арбат",
];

const COMMENTS = [
  "", "", "", "", "",
  "Домофон не работает, позвоните",
  "Без лука, пожалуйста",
  "Курьеру: код 4512",
  "Заказ на день рождения, можно свечу?",
  "Оставьте у консьержа",
  "Позвоните за 10 минут до приезда",
];

/** Детерминированный псевдослучайный генератор: сид повторяется — картинка тоже. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = makeRandom(20260921);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

function int(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function phoneFor(index: number): string {
  // Хвост перемешан, чтобы не получались номера вида 100-00-00.
  const tail = String((3_141_593 + index * 76_543) % 10_000_000).padStart(7, "0");
  return normalizePhone(`+7 (9${String(10 + (index % 90)).padStart(2, "0")}) ${tail}`);
}

/** Сколько заказов в этот день: пятница и суббота — пик, вторник — дно. */
function ordersForDay(date: Date): number {
  const weekday = date.getUTCDay();
  const base = [2, 2, 1, 2, 3, 5, 4][weekday]!;
  return Math.max(0, base + int(-1, 2));
}

/** Час заказа: обед и ужин, ночью почти никто не заказывает. */
function hourOfOrder(): number {
  const roll = random();
  if (roll < 0.25) return int(12, 15);
  if (roll < 0.9) return int(18, 22);
  return int(16, 17);
}

const FOOD = MENU.filter((item) => item.category !== "bevande");

function buildLines(fulfillment: Fulfillment): { itemId: string; quantity: number }[] {
  // Первая позиция всегда еда: заказ из одного бокала вина на вынос —
  // артефакт генератора, а не то, что бывает в жизни.
  const lines: { itemId: string; quantity: number }[] = [
    { itemId: pick(FOOD).id, quantity: 1 },
  ];
  const count = int(0, 4);

  for (let i = 0; i < count; i += 1) {
    const item = pick(MENU);
    if (lines.some((line) => line.itemId === item.id)) continue;
    lines.push({ itemId: item.id, quantity: random() < 0.8 ? 1 : int(2, 3) });
  }

  // Доставка ниже минимальной суммы не оформляется — добираем чем-нибудь сытным.
  if (fulfillment === "delivery") {
    let guard = 0;
    while (guard < 10) {
      try {
        priceOrder(lines, "delivery");
        break;
      } catch (error) {
        if (!(error instanceof OrderError)) throw error;
        const filler = pick(MENU.filter((item) => item.price >= 900));
        const existing = lines.find((line) => line.itemId === filler.id);
        if (existing) existing.quantity += 1;
        else lines.push({ itemId: filler.id, quantity: 1 });
        guard += 1;
      }
    }
  }

  return lines;
}

/**
 * Статус в зависимости от возраста заказа: то, что было вчера, уже выдано,
 * а сегодняшние заказы живут на разных стадиях кухни.
 */
function statusFor(ageHours: number): OrderStatus {
  if (random() < 0.07) return "cancelled";
  if (ageHours > 6) return "done";
  if (ageHours > 3) return random() < 0.75 ? "done" : "on_way";
  if (ageHours > 1.5) return pick(["cooking", "on_way", "ready", "done"] as const);
  return pick(["new", "new", "accepted", "cooking"] as const);
}

/** Правдоподобная история статусов: заказ не прыгает из «нового» в «выданный» мгновенно. */
function chainTo(status: OrderStatus, fulfillment: Fulfillment): OrderStatus[] {
  const handoff: OrderStatus = fulfillment === "delivery" ? "on_way" : "ready";
  const full: OrderStatus[] = ["new", "accepted", "cooking", handoff, "done"];

  if (status === "cancelled") {
    const cut = int(1, 3);
    return [...full.slice(0, cut), "cancelled"];
  }

  const index = full.indexOf(status);
  return index < 0 ? ["new", status] : full.slice(0, index + 1);
}

/** Кладёт один заказ с заданным временем и статусом, дописывая правдоподобный таймлайн. */
async function placeOrder(createdAt: Date, status: OrderStatus): Promise<boolean> {
  const db = await getDb();
  const fulfillment: Fulfillment = random() < 0.7 ? "delivery" : "pickup";
  const lines = buildLines(fulfillment);

  let priced;
  try {
    priced = priceOrder(lines, fulfillment);
  } catch {
    return false; // Не собрался корректный заказ — просто пропускаем итерацию.
  }

  // Часть гостей возвращается: постоянные выпадают чаще случайных.
  const guestIndex = random() < 0.4 ? int(0, REGULARS - 1) : int(0, GUEST_POOL - 1);

  const input: OrderInput = {
    lines,
    fulfillment,
    name: guestName(guestIndex),
    phone: phoneFor(guestIndex),
    address:
      fulfillment === "delivery" ? `${pick(STREETS)}, ${int(1, 40)}, кв. ${int(1, 300)}` : "",
    comment: pick(COMMENTS),
  };

  const order = await createOrder({
    input,
    priced,
    source: random() < 0.85 ? "site" : "telegram",
    createdAt,
    status,
  });

  // createOrder пишет одно событие «создан». Для демо-таймлайна досыпаем
  // остальные переходы с разумными интервалами — это делает только сид.
  const chain = chainTo(status, fulfillment);
  let stamp = createdAt.getTime();
  await db.query(`delete from order_events where order_id = $1`, [order.id]);

  for (let step = 0; step < chain.length; step += 1) {
    await db.query(
      `insert into order_events (order_id, from_status, to_status, actor, created_at)
       values ($1, $2, $3, $4, $5)`,
      [
        order.id,
        step === 0 ? null : chain[step - 1],
        chain[step],
        step === 0 ? (order.source === "site" ? "сайт" : "телеграм") : "менеджер",
        new Date(stamp),
      ],
    );
    stamp += int(4, 25) * 60_000;
  }

  await db.query(`update orders set updated_at = $1 where id = $2`, [new Date(stamp), order.id]);
  return true;
}

async function main() {
  const db = await getDb();

  const [existing] = await db.query<{ count: number }>(`select count(*)::int as count from orders`);
  if ((existing?.count ?? 0) > 0) {
    if (!process.argv.includes("--force")) {
      console.error(
        `В базе уже ${existing!.count} заказов. Перетереть демо-данными: npm run db:seed -- --force`,
      );
      process.exit(1);
    }
    /*
     * Порядок важен: order_lines, order_events, заметки и метки уедут каскадом за
     * orders и customers. Брони и стоп-лист каскадом не уезжают — у них нет
     * внешнего ключа на гостя, поэтому их надо удалить отдельно, иначе при каждом
     * повторном сиде брони удваиваются.
     */
    await db.exec(
      `delete from orders; delete from customers; delete from reservations; delete from menu_availability;`,
    );
    console.info("Старые заказы удалены (--force)");
  }

  const now = new Date();
  let created = 0;

  // История: заказы по часам работы заведения, статусы — по возрасту заказа.
  for (let dayOffset = DAYS; dayOffset >= 1; dayOffset -= 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - dayOffset);

    for (let i = 0; i < ordersForDay(day); i += 1) {
      const createdAt = new Date(day);
      createdAt.setUTCHours(hourOfOrder(), int(0, 59), int(0, 59), 0);
      if (createdAt > now) continue;

      const ageHours = (now.getTime() - createdAt.getTime()) / 3_600_000;
      if (await placeOrder(createdAt, statusFor(ageHours))) created += 1;
    }
  }

  /*
   * Смена «прямо сейчас»: несколько заказов за последние часы, которые ещё в работе.
   * Здесь мы сознательно игнорируем часы работы ресторана — иначе при запуске
   * сида утром вкладки «Новые» и «Готовятся» окажутся пустыми, и проверить
   * рабочий экран будет нечем.
   */
  const live: OrderStatus[] = [
    "new", "new", "new", "accepted", "accepted", "cooking", "cooking",
    "on_way", "ready", "cancelled",
  ];

  for (let i = 0; i < live.length; i += 1) {
    const minutesAgo = 15 + i * int(12, 30);
    const createdAt = new Date(now.getTime() - minutesAgo * 60_000);
    if (await placeOrder(createdAt, live[i]!)) created += 1;
  }

  /*
   * Метки, заметки, брони и пара позиций в стоп-листе: без них новые экраны
   * выглядят как пустые заготовки, и проверить их нечем.
   */
  const phones = await db.query<{ phone: string; name: string; orders: number }>(
    `select c.phone, c.name, count(o.id)::int as orders
     from customers c join orders o on o.customer_phone = c.phone
     group by c.phone, c.name
     order by orders desc
     limit 24`,
  );

  const NOTES = [
    "Аллергия на орехи — предупредить кухню",
    "Просит стол у окна",
    "В прошлый раз ждал час, извинились и дали десерт",
    "Всегда просит счёт отдельно",
    "Приходит с собакой, сажаем на террасу",
    "Не любит острое, даже слегка",
    "Оставляет чай наличными, готовить сдачу",
  ];

  for (const [index, guest] of phones.entries()) {
    // Постоянных помечаем, остальным ставим метки через одного.
    if (guest.orders >= 4) {
      await db.query(
        `insert into customer_tags (phone, tag) values ($1, 'regular') on conflict do nothing`,
        [guest.phone],
      );
    }
    if (index % 5 === 0) {
      const tag = CUSTOMER_TAGS[(index / 5) % CUSTOMER_TAGS.length]!;
      await db.query(
        `insert into customer_tags (phone, tag) values ($1, $2) on conflict do nothing`,
        [guest.phone, tag.id],
      );
    }
    if (index % 3 === 0) {
      await db.query(`insert into customer_notes (phone, text) values ($1, $2)`, [
        guest.phone,
        NOTES[index % NOTES.length]!,
      ]);
    }
  }

  const reservationStatuses = ["new", "confirmed", "confirmed", "seated", "cancelled"] as const;
  let reservations = 0;

  for (let i = 0; i < 14; i += 1) {
    const guest = phones[i % phones.length];
    if (!guest) break;

    // Половина броней в будущем, половина уже прошла.
    const dayShift = i < 8 ? Math.floor(i / 2) : -(i - 6);
    const when = new Date(now);
    when.setUTCDate(when.getUTCDate() + dayShift);
    const hour = 18 + (i % 4);

    await db.query(
      `insert into reservations (guest_name, phone, at, guests, area, comment, status)
       values ($1, $2, (($3::text || ' ' || $4::text)::timestamp at time zone $5::text), $6, $7, $8, $9)`,
      [
        guest.name,
        guest.phone,
        when.toISOString().slice(0, 10),
        `${String(hour).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}:00`,
        RESTAURANT_TZ,
        2 + (i % 5),
        i % 3 === 0 ? RESERVATION_AREAS[i % RESERVATION_AREAS.length]! : "",
        i % 4 === 0 ? "День рождения, нужна свеча" : "",
        dayShift < 0 ? "seated" : reservationStatuses[i % reservationStatuses.length]!,
      ],
    );
    reservations += 1;
  }

  // Стоп-лист: два блюда, как это и бывает к концу вечера.
  for (const itemId of ["vongole", "ossobuco"]) {
    if (!MENU.some((item) => item.id === itemId)) continue;
    await db.query(
      `insert into menu_availability (item_id, available, reason)
       values ($1, false, $2)
       on conflict (item_id) do update set available = false, reason = excluded.reason`,
      [itemId, itemId === "vongole" ? "закончились мидии" : "закончилась голяшка"],
    );
  }

  const [summary] = await db.query<{ orders: number; revenue: number; customers: number }>(
    `select count(*)::int as orders,
            coalesce(sum(total) filter (where status <> 'cancelled'), 0)::int as revenue,
            count(distinct customer_phone)::int as customers
     from orders`,
  );

  console.info(
    `Готово: ${created} заказов, ${summary!.customers} гостей, ${reservations} броней, ` +
      `выручка ${summary!.revenue} ₽ за ${DAYS} дней.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("Сид упал:", error);
  process.exit(1);
});
