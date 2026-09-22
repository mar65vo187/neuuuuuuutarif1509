import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notificationQueue } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { writeAudit } from "@/lib/enterprise";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

const ids = z.array(z.number().int().positive()).min(1).max(100);

const schema = z.union([
  z.object({ action: z.literal("mark_read"), all: z.literal(true) }).strict(),
  z.object({
    action: z.enum(["mark_read", "mark_unread", "archive", "restore", "unsnooze"]),
    ids,
  }).strict(),
  z.object({
    action: z.literal("snooze"),
    ids,
    until: z.string().datetime(),
  }).strict(),
]);

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    const parsed = schema.safeParse(await readJsonBody(request, 16 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ungültige Aktion." }, { status: 422 });

    const now = new Date();
    if (parsed.data.action === "snooze") {
      const until = new Date(parsed.data.until);
      const max = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      if (!(until > now) || until > max) {
        return NextResponse.json({ ok: false, error: "Wiedervorlage muss in der Zukunft und innerhalb von 90 Tagen liegen." }, { status: 422 });
      }
    }

    const changed = await db.transaction(async (tx) => {
      const base = and(
        eq(notificationQueue.employeeId, user.id),
        eq(notificationQueue.channel, "in_app"),
      );
      const selection = "all" in parsed.data
        ? and(base, eq(notificationQueue.status, "pending"), isNull(notificationQueue.archivedAt))
        : and(base, inArray(notificationQueue.id, parsed.data.ids));

      const patch: Partial<typeof notificationQueue.$inferInsert> = {};
      if (parsed.data.action === "mark_read") {
        patch.status = "read";
        patch.readAt = now;
        patch.sentAt = now;
      } else if (parsed.data.action === "mark_unread") {
        patch.status = "pending";
        patch.readAt = null;
      } else if (parsed.data.action === "archive") {
        patch.archivedAt = now;
      } else if (parsed.data.action === "restore") {
        patch.archivedAt = null;
      } else if (parsed.data.action === "unsnooze") {
        patch.snoozedUntil = null;
      } else if (parsed.data.action === "snooze") {
        patch.snoozedUntil = new Date(parsed.data.until);
      }

      const rows = await tx.update(notificationQueue)
        .set(patch)
        .where(selection)
        .returning({ id: notificationQueue.id });

      if (rows.length) {
        await writeAudit(tx, user.id, `notification.${parsed.data.action}`, "notification", null, undefined, {
          ids: rows.map((row) => row.id),
          ...(parsed.data.action === "snooze" ? { until: parsed.data.until } : {}),
        });
      }
      return rows.length;
    });

    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "Benachrichtigung konnte nicht aktualisiert werden." }, { status: 500 });
  }
}
