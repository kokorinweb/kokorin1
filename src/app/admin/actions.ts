"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { currentSession, endSession, passwordMatches, startSession } from "@/lib/auth";
import { setOrderStatus, StatusError } from "@/lib/db/orders";
import { isOrderStatus } from "@/lib/status";
import { rateLimit } from "@/lib/ratelimit";

export async function login(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Пароль один на всех, поэтому подбор — реальный сценарий, а не теория.
  if (!rateLimit(`admin-login:${ip}`, 8, 60_000)) {
    redirect("/admin/login?error=rate");
  }

  if (!passwordMatches(password)) {
    redirect("/admin/login?error=wrong");
  }

  await startSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

export type StatusResult = { ok: true } | { ok: false; error: string };

/** Смена статуса заказа. Проверку перехода делает база, здесь только права и ответ интерфейсу. */
export async function changeStatus(number: string, to: string): Promise<StatusResult> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "Сессия истекла, войдите заново" };

  if (!isOrderStatus(to)) return { ok: false, error: "Неизвестный статус" };

  try {
    await setOrderStatus(number, to, "менеджер");
  } catch (error) {
    if (error instanceof StatusError) return { ok: false, error: error.message };
    console.error("[admin] не удалось сменить статус:", error);
    return { ok: false, error: "База недоступна, попробуйте ещё раз" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${number}`);
  return { ok: true };
}

/* ───────────────────────── Гости ───────────────────────── */

export type ActionResult = { ok: true } | { ok: false; error: string };

async function guard(): Promise<ActionResult> {
  const session = await currentSession();
  return session ? { ok: true } : { ok: false, error: "Сессия истекла, войдите заново" };
}

export async function addNote(phone: string, text: string): Promise<ActionResult> {
  const allowed = await guard();
  if (!allowed.ok) return allowed;

  if (!text.trim()) return { ok: false, error: "Заметка пустая" };

  const { addCustomerNote } = await import("@/lib/db/customers");
  await addCustomerNote(phone, text);
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`);
  return { ok: true };
}

export async function removeNote(phone: string, id: number): Promise<ActionResult> {
  const allowed = await guard();
  if (!allowed.ok) return allowed;

  const { deleteCustomerNote } = await import("@/lib/db/customers");
  await deleteCustomerNote(id);
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`);
  return { ok: true };
}

export async function toggleTag(phone: string, tag: string, on: boolean): Promise<ActionResult> {
  const allowed = await guard();
  if (!allowed.ok) return allowed;

  const { setCustomerTag } = await import("@/lib/db/customers");
  try {
    await setCustomerTag(phone, tag, on);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Не удалось" };
  }

  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`);
  revalidatePath("/admin/customers");
  return { ok: true };
}

/* ───────────────────────── Стоп-лист ───────────────────────── */

export async function toggleAvailability(
  itemId: string,
  available: boolean,
  reason: string,
): Promise<ActionResult> {
  const allowed = await guard();
  if (!allowed.ok) return allowed;

  const { setAvailability } = await import("@/lib/db/availability");
  try {
    await setAvailability(itemId, available, reason);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Не удалось" };
  }

  // Стоп-лист виден и гостям: витрина, корзина и главная тоже должны обновиться.
  revalidatePath("/admin/stoplist");
  revalidatePath("/admin");
  revalidatePath("/menu");
  revalidatePath("/cart");
  revalidatePath("/");
  return { ok: true };
}

/* ───────────────────────── Брони ───────────────────────── */

export async function createReservationAction(
  input: unknown,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const allowed = await guard();
  if (!allowed.ok) return allowed;

  const { reservationSchema } = await import("@/lib/reservation");
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  }

  const { createReservation } = await import("@/lib/db/reservations");
  const reservation = await createReservation(parsed.data);

  revalidatePath("/admin/reservations");
  revalidatePath("/admin");
  return { ok: true, id: reservation.id };
}

export async function setReservationStatusAction(
  id: number,
  to: string,
): Promise<ActionResult> {
  const allowed = await guard();
  if (!allowed.ok) return allowed;

  const { isReservationStatus } = await import("@/lib/reservation");
  if (!isReservationStatus(to)) return { ok: false, error: "Неизвестный статус" };

  const { setReservationStatus, ReservationError } = await import("@/lib/db/reservations");
  try {
    await setReservationStatus(id, to);
  } catch (error) {
    if (error instanceof ReservationError) return { ok: false, error: error.message };
    throw error;
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/admin");
  return { ok: true };
}

/* ───────────────────────── Заказ по телефону ───────────────────────── */

export type PhoneOrderResult =
  | { ok: true; number: string }
  | { ok: false; error: string };

/**
 * Заказ, принятый по телефону. Считается тем же кодом, что и заказ с сайта:
 * `orderSchema` + `priceOrder` + тот же стоп-лист. Ручного ввода цен здесь нет и
 * не будет — иначе появится второй источник правды по деньгам.
 */
export async function createPhoneOrder(input: unknown): Promise<PhoneOrderResult> {
  const allowed = await guard();
  if (!allowed.ok) return allowed;

  const { orderSchema, priceOrder, OrderError } = await import("@/lib/order");
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  }

  const order = parsed.data;
  if (order.fulfillment === "delivery" && order.address.trim().length < 5) {
    return { ok: false, error: "Укажите адрес доставки" };
  }

  const { unavailableItemsSafe } = await import("@/lib/db/availability");
  const { createOrder } = await import("@/lib/db/orders");
  const { notifyNewOrder } = await import("@/lib/telegram");

  let priced;
  try {
    priced = priceOrder(order.lines, order.fulfillment, await unavailableItemsSafe());
  } catch (error) {
    if (error instanceof OrderError) return { ok: false, error: error.message };
    throw error;
  }

  let saved;
  try {
    saved = await createOrder({ input: order, priced, source: "phone" });
  } catch (error) {
    console.error("[admin] телефонный заказ не записался:", error);
    return { ok: false, error: "База недоступна, заказ не сохранён" };
  }

  try {
    await notifyNewOrder(saved.number, order, priced);
  } catch (error) {
    // Заказ уже в базе — это главное; уведомление в чат не критично.
    console.error("[admin] не удалось отправить уведомление в Telegram:", error);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  return { ok: true, number: saved.number };
}

/** Кто звонит: подсказка по номеру, пока менеджер набирает заказ. */
export async function lookupCustomer(phone: string): Promise<{
  found: boolean;
  name?: string;
  ordersCount?: number;
  lastOrderAt?: string;
  tags?: string[];
}> {
  const allowed = await guard();
  if (!allowed.ok) return { found: false };

  const { normalizePhone } = await import("@/lib/phone");
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return { found: false };

  const { customerBrief } = await import("@/lib/db/customers");
  const brief = await customerBrief(normalizePhone(phone));
  if (!brief) return { found: false };

  return {
    found: true,
    name: brief.name,
    ordersCount: brief.ordersCount,
    lastOrderAt: brief.lastOrderAt?.toISOString(),
    tags: brief.tags,
  };
}
