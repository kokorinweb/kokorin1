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
