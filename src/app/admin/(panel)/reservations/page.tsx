import Link from "next/link";
import { listReservations, reservationsToday, type ReservationScope } from "@/lib/db/reservations";
import { Shell } from "@/components/admin/Shell";
import { Card, CardHead, Empty } from "@/components/admin/ui";
import {
  ReservationForm,
  ReservationStatusControl,
} from "@/components/admin/ReservationControls";
import { moment, dayLabel } from "@/components/admin/format";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const SCOPES: { id: ReservationScope; title: string }[] = [
  { id: "today", title: "Сегодня" },
  { id: "upcoming", title: "Дальше" },
  { id: "past", title: "Прошедшие" },
  { id: "all", title: "Все" },
];

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const params = await searchParams;
  const scope = (SCOPES.find((item) => item.id === params.scope)?.id ?? "upcoming") as ReservationScope;

  const [reservations, today] = await Promise.all([listReservations(scope), reservationsToday()]);

  return (
    <Shell
      title="Брони"
      subtitle={
        today.count > 0
          ? `на сегодня ${today.count} ${today.count === 1 ? "броня" : "броней"} на ${today.guests} гостей`
          : "на сегодня броней нет"
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((item) => (
              <Link
                key={item.id}
                href={`/admin/reservations?scope=${item.id}`}
                aria-current={item.id === scope ? "true" : undefined}
                className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                  item.id === scope
                    ? "border-accent/25 bg-accent-tint text-accent-strong"
                    : "border-line bg-white text-ink-soft hover:bg-tint"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </div>

          {reservations.length === 0 ? (
            <Empty
              title="Броней в этом списке нет"
              hint="Брони принимаются по телефону — запишите её в форме справа, и она появится здесь."
            />
          ) : (
            <ul className="space-y-3">
              {reservations.map((reservation) => (
                <li
                  key={reservation.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-white p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="font-bold">{reservation.guestName}</p>
                      <span className="text-sm tabular-nums text-ink-muted">
                        {reservation.guests} чел.
                      </span>
                      {reservation.area ? (
                        <span className="rounded-full bg-tint px-2 py-0.5 text-[11px] text-ink-soft">
                          {reservation.area}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {moment(reservation.at)}
                    </p>

                    <a
                      href={`tel:${reservation.phone}`}
                      className="text-xs tabular-nums text-ink-muted hover:text-ink"
                    >
                      {formatPhone(reservation.phone)}
                    </a>

                    {reservation.comment ? (
                      <p className="mt-2 rounded-xl bg-gold-tint px-3 py-1.5 text-xs text-gold-ink">
                        {reservation.comment}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <ReservationStatusControl id={reservation.id} status={reservation.status} />
                    <span className="text-[11px] text-ink-muted">
                      записана {dayLabel(reservation.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Форма рядом со списком, а не в модальном окне: запись брони — это то,
            что делают во время разговора, глядя на уже занятые часы. */}
        <Card className="self-start">
          <CardHead title="Новая броня" hint="по звонку гостя" />
          <div className="mt-4">
            <ReservationForm />
          </div>
        </Card>
      </div>
    </Shell>
  );
}
