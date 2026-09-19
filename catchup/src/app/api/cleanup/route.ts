import { NextResponse } from "next/server";
import { purgeOldMessages } from "@/lib/repo";
import { RETENTION_DAYS } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Удаление просроченных сообщений. Дёргается по расписанию (Vercel Cron или
 * обычный cron с curl). Хранить чужую переписку дольше нужного — плохая идея
 * и с точки зрения доверия, и с точки зрения диска.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CATCHUP_CRON_SECRET ?? "";
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const removed = purgeOldMessages();
  return NextResponse.json({ removed, retention_days: RETENTION_DAYS });
}
