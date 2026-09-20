import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leadNotes, leads } from "@/db/schema";
import { tasks } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";
import { LEAD_CONTACT_OUTCOME_LABELS, LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS } from "@/lib/content";
import { leadUpdateSchema } from "@/lib/validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { emitEvent, runAutomationEvent, writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  let user;
  try { user = await getCurrentUser(); }
  catch { return NextResponse.json({ ok: false, error: "Anmeldung momentan nicht überprüfbar. Bitte erneut versuchen." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }); }
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

    const autoCalledStatus = !data.status && data.contactOutcome && data.contactOutcome !== "open" && existing.status === "neu"
      ? "kontaktiert" as const
      : undefined;
    const requestedStatus = data.status ?? autoCalledStatus;

    if (requestedStatus === "termin_bestaetigt" && !(data.confirmedSlot || existing.confirmedSlot)) {
      return NextResponse.json({ ok: false, error: "Bitte trage zuerst eine abgestimmte Terminzeit ein." }, { status: 422 });
    }

    if (data.assignToMe && existing.assignedEmployeeId !== user.id) {
      patch.assignedEmployeeId = user.id;
      systemNotes.push(`${user.name} hat die Anfrage übernommen.`);
    }

    if (data.priority && data.priority !== existing.priority) {
      patch.priority = data.priority;
      systemNotes.push(`Priorität geändert: ${LEAD_PRIORITY_LABELS[existing.priority] ?? existing.priority} → ${LEAD_PRIORITY_LABELS[data.priority]}.`);
    }

    if (data.contactOutcome && data.contactOutcome !== existing.contactOutcome) {
      patch.contactOutcome = data.contactOutcome;
      if (data.contactOutcome !== "open") patch.lastContactAt = new Date();
      systemNotes.push(`Gesprächsausgang: ${LEAD_CONTACT_OUTCOME_LABELS[data.contactOutcome]}.`);
    }

    if (data.tags) {
      const tags = [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
      patch.tags = tags;
      if (JSON.stringify(tags) !== JSON.stringify(existing.tags)) systemNotes.push(`Tags aktualisiert: ${tags.length ? tags.join(", ") : "keine"}.`);
    }

    if (data.nextActionAt !== undefined) {
      patch.nextActionAt = data.nextActionAt ? new Date(data.nextActionAt) : null;
      systemNotes.push(data.nextActionAt
        ? `Wiedervorlage gesetzt: ${new Date(data.nextActionAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}.`
        : "Wiedervorlage entfernt.");
    }

    if (requestedStatus && requestedStatus !== existing.status) {
      patch.status = requestedStatus;
      systemNotes.push(`Status geändert: ${LEAD_STATUS_LABELS[existing.status]} → ${LEAD_STATUS_LABELS[requestedStatus]}.`);
      if (requestedStatus === "kontaktiert" && !patch.lastContactAt) patch.lastContactAt = new Date();
      if (requestedStatus === "termin_bestaetigt") {
        patch.confirmedAt = new Date();
        if (data.confirmedSlot) patch.confirmedSlot = data.confirmedSlot;
        systemNotes.push(`Termin eingetragen${data.confirmedSlot ? `: ${data.confirmedSlot}` : ""}.`);
      }
      if (["neu", "kontaktiert", "verloren"].includes(requestedStatus)) {
        patch.confirmedAt = null;
        patch.confirmedSlot = null;
      }
      if (["abgeschlossen", "verloren"].includes(requestedStatus)) {
        patch.closedAt = new Date();
        patch.nextActionAt = null;
      } else if (existing.closedAt) {
        patch.closedAt = null;
      }
      if (!existing.assignedEmployeeId && !data.assignToMe) patch.assignedEmployeeId = user.id;
    } else if (data.confirmedSlot && data.confirmedSlot !== existing.confirmedSlot) {
      patch.confirmedSlot = data.confirmedSlot;
      if (existing.status === "termin_bestaetigt") patch.confirmedAt = new Date();
      systemNotes.push(`Terminzeit aktualisiert: ${data.confirmedSlot}.`);
    }

    await tx.update(leads).set(patch).where(eq(leads.id, id));

    const effectiveStatus = requestedStatus ?? existing.status;
    const effectiveNextAction = Object.prototype.hasOwnProperty.call(patch, "nextActionAt")
      ? patch.nextActionAt ?? null
      : existing.nextActionAt;
    const taskOwner = existing.createdByEmployeeId ?? user.id;

    if (data.nextActionAt !== undefined || ["abgeschlossen", "verloren"].includes(effectiveStatus)) {
      const [followUp] = await tx.select({ id: tasks.id }).from(tasks).where(and(
        eq(tasks.entityType, "lead"),
        eq(tasks.entityId, id),
        eq(tasks.type, "crm_follow_up"),
        inArray(tasks.status, ["open", "in_progress"]),
      )).orderBy(tasks.createdAt).limit(1);

      if (effectiveNextAction && !["abgeschlossen", "verloren"].includes(effectiveStatus)) {
        if (followUp) {
          await tx.update(tasks).set({
            assignedToEmployeeId: taskOwner,
            title: `Lead nachfassen: ${existing.name}`,
            priority: (patch.priority ?? existing.priority) === "hot" ? "critical" : (patch.priority ?? existing.priority) === "high" ? "high" : "normal",
            status: "open",
            dueAt: effectiveNextAction,
            completedAt: null,
            updatedAt: new Date(),
          }).where(eq(tasks.id, followUp.id));
        } else {
          await tx.insert(tasks).values({
            entityType: "lead",
            entityId: id,
            assignedToEmployeeId: taskOwner,
            createdByEmployeeId: user.id,
            type: "crm_follow_up",
            title: `Lead nachfassen: ${existing.name}`,
            priority: (patch.priority ?? existing.priority) === "hot" ? "critical" : (patch.priority ?? existing.priority) === "high" ? "high" : "normal",
            status: "open",
            dueAt: effectiveNextAction,
          });
        }
      } else if (followUp) {
        await tx.update(tasks).set({ status: "cancelled", completedAt: null, updatedAt: new Date() }).where(eq(tasks.id, followUp.id));
      }
    }

    if (Object.keys(patch).length > 1 || data.assignToMe) {
      await writeAudit(tx, user.id, "lead.updated", "lead", id,
        {
          status: existing.status,
          assignedEmployeeId: existing.assignedEmployeeId,
          confirmedSlot: existing.confirmedSlot,
          priority: existing.priority,
          contactOutcome: existing.contactOutcome,
          nextActionAt: existing.nextActionAt,
          tags: existing.tags,
        },
        {
          status: effectiveStatus,
          assignedEmployeeId: data.assignToMe ? user.id : patch.assignedEmployeeId ?? existing.assignedEmployeeId,
          confirmedSlot: data.confirmedSlot ?? existing.confirmedSlot,
          priority: patch.priority ?? existing.priority,
          contactOutcome: patch.contactOutcome ?? existing.contactOutcome,
          nextActionAt: effectiveNextAction,
          tags: patch.tags ?? existing.tags,
        });
    }

    if (systemNotes.length) {
      await tx.insert(leadNotes).values(systemNotes.map((body) => ({ leadId: id, employeeId: user.id, kind: "system", body })));
    }
    if (data.note && data.note.trim()) {
      await tx.insert(leadNotes).values({ leadId: id, employeeId: user.id, kind: "note", body: data.note.trim() });
    }
    if (requestedStatus && requestedStatus !== existing.status) {
      await emitEvent(tx, `lead.status.${requestedStatus}`, "lead", id, { assignedEmployeeId: data.assignToMe ? user.id : existing.assignedEmployeeId ?? user.id, previousStatus: existing.status, status: requestedStatus });
      await runAutomationEvent(tx, `lead.status.${requestedStatus}`, "lead", id, { assignedEmployeeId: data.assignToMe ? user.id : existing.assignedEmployeeId ?? user.id, previousStatus: existing.status, status: requestedStatus }, user.id);
    }
    if (data.priority || data.contactOutcome || data.nextActionAt !== undefined || data.tags) {
      await emitEvent(tx, "lead.crm.updated", "lead", id, {
        assignedEmployeeId: existing.createdByEmployeeId ?? existing.assignedEmployeeId ?? user.id,
        priority: patch.priority ?? existing.priority,
        contactOutcome: patch.contactOutcome ?? existing.contactOutcome,
        nextActionAt: effectiveNextAction?.toISOString?.() ?? null,
      });
    }

    return NextResponse.json({ ok: true });
    });
  } catch {
    console.error("[portal/leads PATCH] Datenbankzugriff fehlgeschlagen.");
    return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}
