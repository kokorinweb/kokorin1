/**
 * Схема CRM. Держим её строкой в коде, а не файлом .sql: так она гарантированно
 * попадает в серверный бандл на Vercel, где никакого рядом лежащего файла нет.
 *
 * Всё через IF NOT EXISTS — миграция применяется на старте процесса и безопасна
 * для повторного запуска. Для чего-то сложнее (переименование колонок, бэкфилл)
 * понадобится нормальный инструмент миграций; пока он не нужен.
 *
 * Почему id — integer, а не bigint: node-postgres отдаёт int8 строкой, чтобы не
 * потерять точность, и код начинает сравнивать "12" с 12. Ресторан до двух
 * миллиардов заказов не дойдёт.
 */
export const SCHEMA_SQL = `
create table if not exists customers (
  phone          text primary key,
  name           text not null,
  created_at     timestamptz not null default now(),
  last_order_at  timestamptz
);

create table if not exists orders (
  id             integer generated always as identity primary key,
  number         text not null unique,
  status         text not null default 'new',
  fulfillment    text not null,
  source         text not null default 'site',
  customer_phone text not null references customers(phone),
  customer_name  text not null,
  address        text not null default '',
  comment        text not null default '',
  subtotal       integer not null,
  discount       integer not null default 0,
  delivery_fee   integer not null default 0,
  total          integer not null,
  eta_minutes    integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_status_idx     on orders (status);
create index if not exists orders_phone_idx      on orders (customer_phone);

-- Строки заказа — снапшот, а не ссылка на меню.
-- Цена в MENU меняется деплоем; заказ прошлого месяца от этого дорожать не должен.
create table if not exists order_lines (
  id         integer generated always as identity primary key,
  order_id   integer not null references orders(id) on delete cascade,
  item_id    text not null,
  item_name  text not null,
  category   text not null,
  unit_price integer not null,
  quantity   integer not null,
  line_total integer not null
);

create index if not exists order_lines_order_idx    on order_lines (order_id);
create index if not exists order_lines_category_idx on order_lines (category);

-- История статусов: кто и когда двигал заказ. Нужна, когда клиент звонит
-- с «я заказал час назад», а в чате смены все разводят руками.
create table if not exists order_events (
  id          integer generated always as identity primary key,
  order_id    integer not null references orders(id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor       text not null default 'system',
  created_at  timestamptz not null default now()
);

create index if not exists order_events_order_idx on order_events (order_id, created_at);
-- ─── Стоп-лист ───────────────────────────────────────────────────────────
-- Меню живёт в коде, а «закончилось» — состояние вечера, а не деплоя.
-- Поэтому здесь только доступность по id блюда, без названий и цен.
create table if not exists menu_availability (
  item_id    text primary key,
  available  boolean not null default true,
  reason     text not null default '',
  updated_at timestamptz not null default now()
);

-- ─── Гости ──────────────────────────────────────────────────────────────
-- Заметки менеджера: аллергия, «просит стол у окна», «в прошлый раз ждал час».
create table if not exists customer_notes (
  id         integer generated always as identity primary key,
  phone      text not null references customers(phone) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_notes_phone_idx on customer_notes (phone, created_at desc);

-- Метки из фиксированного словаря (src/lib/tags.ts): их видно в списке гостей.
create table if not exists customer_tags (
  phone      text not null references customers(phone) on delete cascade,
  tag        text not null,
  created_at timestamptz not null default now(),
  primary key (phone, tag)
);

-- ─── Брони столиков ─────────────────────────────────────────────────────
create table if not exists reservations (
  id          integer generated always as identity primary key,
  guest_name  text not null,
  phone       text not null,
  at          timestamptz not null,
  guests      integer not null,
  area        text not null default '',
  comment     text not null default '',
  status      text not null default 'new',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reservations_at_idx     on reservations (at);
create index if not exists reservations_status_idx on reservations (status);

`;
