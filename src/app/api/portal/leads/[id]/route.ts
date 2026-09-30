import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leadNotes, leads } from "@/db/schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";
import { LEAD_CONTACT_OUTCOME_LABELS, LEAD_LOST_REASON_LABELS, LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS } from "@/lib/content";
import { leadUpdateSchema } from "@/lib/validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { emitEvent, runAutomationEvent, writeAudit } from "@/lib/enterprise";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";
import { isTerminalLeadStatus, reassignLeadFollowUps, syncLeadFollowUp } from "@/lib/lead-mutation";

export const dynamic = "force-dynamic";

function euroFromCents(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function germanDate(isoDate: string) {
  return `${isoDate.slice(8, 10)}.${isoDate.slice(5, 7)}.${isoDate.slice(0, 4)}`;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  let user;
  try { user = await getCurrentUser(); }
  catch { return NextResponse.json({ ok: false, error: "Anmeldung momentan nicht überprüfbar. Bitte erneut versuchen." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }); }
  if (!user) return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  try { await requirePermission(user, PORTAL_PERMISSION.LEAD_EDIT); }
  catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 403;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Keine Berechtigung." }, { status: Number.isFinite(status) ? status : 403 });
  }

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

    const now = new Date();
    const patch: Partial<typeof leads.$inferInsert> = { updatedAt: now };
    const systemNotes: string[] = [];

    const autoCalledStatus = !data.status && data.contactOutcome && data.contactOutcome !== "open" && existing.status === "neu"
      ? "kontaktiert" as const
      : undefined;
    const requestedStatus = data.status ?? autoCalledStatus;
    const effectiveStatus = requestedStatus ?? existing.status;

    if (requestedStatus === "termin_bestaetigt" && !(data.confirmedSlot || existing.confirmedSlot)) {
      return NextResponse.json({ ok: false, error: "Bitte trage zuerst eine abgestimmte Terminzeit ein." }, { status: 422 });
    }
    if (data.nextActionAt && isTerminalLeadStatus(effectiveStatus)) {
      return NextResponse.json({ ok: false, error: "Bitte öffne den Lead zuerst wieder, bevor du eine Wiedervorlage setzt." }, { status: 422 });
    }
    if (data.lostReason && effectiveStatus !== "verloren") {
      return NextResponse.json({ ok: false, error: "Ein Verlustgrund passt nur zum Status „Nicht zustande gekommen“." }, { status: 422 });
    }

    if (data.assignToMe && existing.assignedEmployeeId !== user.id) {
      patch.assignedEmployeeId = user.id;
      systemNotes.push(`${user.name} hat die Anfrage übernommen.`);
    }
    const assignmentChanged = patch.assignedEmployeeId !== undefined && patch.assignedEmployeeId !== existing.assignedEmployeeId;

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

    const forecastChanges: string[] = [];
    if (data.dealValueCents !== undefined && data.dealValueCents !== (existing.dealValueCents ?? null)) {
      patch.dealValueCents = data.dealValueCents;
      forecastChanges.push(data.dealValueCents === null ? "Wert entfernt" : `Wert ${euroFromCents(data.dealValueCents)}`);
    }
    if (data.winProbability !== undefined && data.winProbability !== (existing.winProbability ?? null)) {
      patch.winProbability = data.winProbability;
      forecastChanges.push(data.winProbability === null ? "Wahrscheinlichkeit entfernt" : `Wahrscheinlichkeit ${data.winProbability} %`);
    }
    if (data.expectedCloseAt !== undefined && data.expectedCloseAt !== (existing.expectedCloseAt ?? null)) {
      patch.expectedCloseAt = data.expectedCloseAt;
      forecastChanges.push(data.expectedCloseAt === null ? "Abschlussdatum entfernt" : `Abschluss erwartet am ${germanDate(data.expectedCloseAt)}`);
    }
    if (forecastChanges.length) systemNotes.push(`Forecast aktualisiert: ${forecastChanges.join(" · ")}.`);

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
        patch.confirmedAt = now;
        systemNotes.push(`Termin eingetragen: ${data.confirmedSlot || existing.confirmedSlot}.`);
      }
      if (["neu", "kontaktiert", "verloren"].includes(requestedStatus)) {
        patch.confirmedAt = null;
        patch.confirmedSlot = null;
      }
      if (!isTerminalLeadStatus(requestedStatus) && existing.closedAt) {
        patch.closedAt = null;
      }
      if (requestedStatus !== "verloren" && existing.lostReason) {
        patch.lostReason = null;
      }
      if (!existing.assignedEmployeeId && !data.assignToMe) patch.assignedEmployeeId = user.id;
    }
    // A combined status + appointment update must retain both submitted fields.
    if (data.confirmedSlot && data.confirmedSlot !== existing.confirmedSlot && !(requestedStatus && ["neu", "kontaktiert", "verloren"].includes(requestedStatus))) {
      patch.confirmedSlot = data.confirmedSlot;
      if (effectiveStatus === "termin_bestaetigt") patch.confirmedAt = now;
      if (requestedStatus !== "termin_bestaetigt" || requestedStatus === existing.status) systemNotes.push(`Terminzeit aktualisiert: ${data.confirmedSlot}.`);
    }
    if (data.lostReason && data.lostReason !== existing.lostReason) {
      patch.lostReason = data.lostReason;
      systemNotes.push(`Verlustgrund: ${LEAD_LOST_REASON_LABELS[data.lostReason]}.`);
    }
    if (isTerminalLeadStatus(effectiveStatus)) {
      patch.nextActionAt = null;
      patch.closedAt = existing.closedAt ?? now;
    }

    await tx.update(leads).set(patch).where(eq(leads.id, id));

    const effectiveNextAction = Object.prototype.hasOwnProperty.call(patch, "nextActionAt")
      ? patch.nextActionAt ?? null
      : existing.nextActionAt;
    const effectiveAssignedEmployeeId = patch.assignedEmployeeId ?? existing.assignedEmployeeId ?? existing.createdByEmployeeId ?? user.id;
    const taskOwner = effectiveAssignedEmployeeId;
    if (assignmentChanged) await reassignLeadFollowUps(tx, [id], taskOwner, now);

    if (data.nextActionAt !== undefined || isTerminalLeadStatus(effectiveStatus) || (data.priority && effectiveNextAction)) {
      await syncLeadFollowUp(tx, {
        leadId: id,
        actorId: user.id,
        ownerId: taskOwner,
        title: `Lead nachfassen: ${existing.name || existing.email || existing.phone || `Lead #${id}`}`,
        priority: patch.priority ?? existing.priority,
        dueAt: effectiveNextAction,
        now,
      });
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
          dealValueCents: existing.dealValueCents ?? null,
          winProbability: existing.winProbability ?? null,
          expectedCloseAt: existing.expectedCloseAt ?? null,
          lostReason: existing.lostReason ?? null,
        },
        {
          status: effectiveStatus,
          assignedEmployeeId: effectiveAssignedEmployeeId,
          confirmedSlot: Object.prototype.hasOwnProperty.call(patch, "confirmedSlot") ? patch.confirmedSlot : existing.confirmedSlot,
          priority: patch.priority ?? existing.priority,
          contactOutcome: patch.contactOutcome ?? existing.contactOutcome,
          nextActionAt: effectiveNextAction,
          tags: patch.tags ?? existing.tags,
          dealValueCents: Object.prototype.hasOwnProperty.call(patch, "dealValueCents") ? patch.dealValueCents : existing.dealValueCents ?? null,
          winProbability: Object.prototype.hasOwnProperty.call(patch, "winProbability") ? patch.winProbability : existing.winProbability ?? null,
          expectedCloseAt: Object.prototype.hasOwnProperty.call(patch, "expectedCloseAt") ? patch.expectedCloseAt : existing.expectedCloseAt ?? null,
          lostReason: Object.prototype.hasOwnProperty.call(patch, "lostReason") ? patch.lostReason : existing.lostReason ?? null,
        });
    }

    if (systemNotes.length) {
      await tx.insert(leadNotes).values(systemNotes.map((body) => ({ leadId: id, employeeId: user.id, kind: "system", body })));
    }
    if (data.note && data.note.trim()) {
      await tx.insert(leadNotes).values({ leadId: id, employeeId: user.id, kind: "note", body: data.note.trim() });
    }
    if (requestedStatus && requestedStatus !== existing.status) {
      await emitEvent(tx, `lead.status.${requestedStatus}`, "lead", id, { assignedEmployeeId: effectiveAssignedEmployeeId, previousStatus: existing.status, status: requestedStatus });
      await runAutomationEvent(tx, `lead.status.${requestedStatus}`, "lead", id, { assignedEmployeeId: effectiveAssignedEmployeeId, previousStatus: existing.status, status: requestedStatus }, user.id);
    }
    if (data.priority || data.contactOutcome || data.nextActionAt !== undefined || data.tags) {
      await emitEvent(tx, "lead.crm.updated", "lead", id, {
        assignedEmployeeId: effectiveAssignedEmployeeId,
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
