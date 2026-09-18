import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leadNotes, leads } from "@/db/schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";
import { LEAD_STATUS_LABELS } from "@/lib/content";
import { leadUpdateSchema } from "@/lib/validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });

  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0 || id > 2147483647) return NextResponse.json({ ok: false, error: "Ungültige ID." }, { status: 400 });

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." }, { status: error instanceof RequestBodyError ? error.status : 400 });
  }
  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Ungültige Daten." }, { status: 422 });
  const data = parsed.data;

  try {
    return await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(leads).where(and(eq(leads.id, id), leadAccessCondition(user))).limit(1).for("update");
    if (!existing) return NextResponse.json({ ok: false, error: "Anfrage nicht gefunden." }, { status: 404 });

    const patch: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
    const systemNotes: string[] = [];

    if (data.status === "termin_bestaetigt" && !(data.confirmedSlot || existing.confirmedSlot)) {
      return NextResponse.json({ ok: false, error: "Bitte trage zuerst eine abgestimmte Terminzeit ein." }, { status: 422 });
    }

    if (data.assignToMe && existing.assignedEmployeeId !== user.id) {
      patch.assignedEmployeeId = user.id;
      systemNotes.push(`${user.name} hat die Anfrage übernommen.`);
    }
    if (data.status && data.status !== existing.status) {
      patch.status = data.status;
      systemNotes.push(`Status geändert: ${LEAD_STATUS_LABELS[existing.status]} → ${LEAD_STATUS_LABELS[data.status]}.`);
      if (data.status === "termin_bestaetigt") {
        patch.confirmedAt = new Date();
        if (data.confirmedSlot) patch.confirmedSlot = data.confirmedSlot;
        systemNotes.push(`Termin bestätigt${data.confirmedSlot ? `: ${data.confirmedSlot}` : ""}.`);
      }
      if (["neu", "kontaktiert", "verloren"].includes(data.status)) {
        patch.confirmedAt = null;
        patch.confirmedSlot = null;
      }
      if (!existing.assignedEmployeeId && !data.assignToMe) patch.assignedEmployeeId = user.id;
    } else if (data.confirmedSlot && data.confirmedSlot !== existing.confirmedSlot) {
      patch.confirmedSlot = data.confirmedSlot;
      if (existing.status === "termin_bestaetigt") patch.confirmedAt = new Date();
      systemNotes.push(`Terminzeit aktualisiert: ${data.confirmedSlot}.`);
    }

    await tx.update(leads).set(patch).where(eq(leads.id, id));

    if (systemNotes.length) {
      await tx.insert(leadNotes).values(systemNotes.map((body) => ({ leadId: id, employeeId: user.id, kind: "system", body })));
    }
    if (data.note && data.note.trim()) {
      await tx.insert(leadNotes).values({ leadId: id, employeeId: user.id, kind: "note", body: data.note.trim() });
    }

    return NextResponse.json({ ok: true });
    });
  } catch (err) {
    console.error("[portal/leads PATCH]", err);
    return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}
