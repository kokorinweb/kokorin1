/**
 * Журнал броней.
 *
 * Время брони приходит из формы как «дата + часы:минуты» по времени заведения.
 * Перевод в момент времени делает Postgres (`timestamp at time zone`), а не JavaScript:
 * иначе придётся руками воспроизводить правила часового пояса и однажды на них
 * наступить на переводе часов.
 */
import { getDb, toDate } from "./client";
import { RESTAURANT } from "../restaurant";
import { normalizePhone } from "../phone";
import {
  isReservationStatus,
  nextReservationStatuses,
  type ReservationInput,
  type ReservationStatus,
} from "../reservation";

const TZ = process.env.RESTAURANT_TZ ?? RESTAURANT.timezone;

export type Reservation = {
  id: number;
  guestName: string;
  phone: string;
  at: Date;
  guests: number;
  area: string;
  comment: string;
  status: ReservationStatus;
  createdAt: Date;
};

type ReservationDbRow = {
  id: number;
  guest_name: string;
  phone: string;
  at: unknown;
  guests: number;
  area: string;
  comment: string;
  status: string;
  created_at: unknown;
};

function mapReservation(row: ReservationDbRow): Reservation {
  return {
    id: row.id,
    guestName: row.guest_name,
    phone: row.phone,
    at: toDate(row.at),
    guests: row.guests,
    area: row.area,
    comment: row.comment,
    status: isReservationStatus(row.status) ? row.status : "new",
    createdAt: toDate(row.created_at),
  };
}

export async function createReservation(input: ReservationInput): Promise<Reservation> {
  const db = await getDb();
  const [row] = await db.query<ReservationDbRow>(
    `insert into reservations (guest_name, phone, at, guests, area, comment)
     values (
       $1, $2,
       (($3::text || ' ' || $4::text)::timestamp at time zone $5::text),
       $6, $7, $8
     )
     returning *`,
    [
      input.guestName,
      normalizePhone(input.phone),
      input.date,
      `${input.time}:00`,
      TZ,
      input.guests,
      input.area ?? "",
      input.comment ?? "",
    ],
  );

  return mapReservation(row!);
}

export type ReservationScope = "today" | "upcoming" | "past" | "all";

export async function listReservations(
  scope: ReservationScope = "upcoming",
  status?: ReservationStatus,
): Promise<Reservation[]> {
  const db = await getDb();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (scope === "today") {
    params.push(TZ);
    clauses.push(`(at at time zone $${params.length})::date = (now() at time zone $${params.length})::date`);
  } else if (scope === "upcoming") {
    clauses.push(`at >= now() - interval '2 hours'`);
  } else if (scope === "past") {
    clauses.push(`at < now() - interval '2 hours'`);
  }

  if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }

  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const order = scope === "past" ? "at desc" : "at asc";

  const rows = await db.query<ReservationDbRow>(
    `select * from reservations ${where} order by ${order} limit 200`,
    params,
  );

  return rows.map(mapReservation);
}

export class ReservationError extends Error {}

export async function setReservationStatus(
  id: number,
  to: ReservationStatus,
): Promise<Reservation> {
  const db = await getDb();

  return db.transaction(async (tx) => {
    const [current] = await tx.query<{ status: string }>(
      `select status from reservations where id = $1 for update`,
      [id],
    );
    if (!current) throw new ReservationError("Броня не найдена");

    const from = isReservationStatus(current.status) ? current.status : "new";
    if (from !== to && !nextReservationStatuses(from).includes(to)) {
      throw new ReservationError(`Из «${from}» нельзя перейти в «${to}»`);
    }

    const [row] = await tx.query<ReservationDbRow>(
      `update reservations set status = $1, updated_at = now() where id = $2 returning *`,
      [to, id],
    );
    return mapReservation(row!);
  });
}

/** Сколько броней на сегодня и на сколько гостей — для сводки. */
export async function reservationsToday(): Promise<{ count: number; guests: number; next: Reservation | null }> {
  const db = await getDb();
  const [totals] = await db.query<{ count: number; guests: number }>(
    `select count(*)::int as count, coalesce(sum(guests), 0)::int as guests
     from reservations
     where (at at time zone $1)::date = (now() at time zone $1)::date
       and status <> 'cancelled'`,
    [TZ],
  );

  const [next] = await db.query<ReservationDbRow>(
    `select * from reservations
     where at >= now() and status in ('new', 'confirmed')
     order by at asc limit 1`,
  );

  return {
    count: totals?.count ?? 0,
    guests: totals?.guests ?? 0,
    next: next ? mapReservation(next) : null,
  };
}
