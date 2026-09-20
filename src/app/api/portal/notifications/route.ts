import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notificationQueue } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { writeAudit } from "@/lib/enterprise";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

const schema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) }),
]);

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    const parsed = schema.safeParse(await readJsonBody(request, 16 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ungültige Auswahl." }, { status: 422 });

    const changed = await db.transaction(async (tx) => {
      const base = and(
        eq(notificationQueue.employeeId, user.id),
        eq(notificationQueue.channel, "in_app"),
        eq(notificationQueue.status, "pending"),
      );
      const condition = "all" in parsed.data
        ? base
        : and(base, inArray(notificationQueue.id, parsed.data.ids));

      const rows = await tx.update(notificationQueue)
        .set({ status: "read", sentAt: new Date() })
        .where(condition)
        .returning({ id: notificationQueue.id });

      if (rows.length) {
        await writeAudit(tx, user.id, "notification.read", "notification", null, undefined, { ids: rows.map((row) => row.id) });
      }
      return rows.length;
    });

    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "Benachrichtigung konnte nicht aktualisiert werden." }, { status: 500 });
  }
}
