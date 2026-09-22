import { NextResponse, type NextRequest } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { leadCallActivities } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";
import { leadCallActivitySchema } from "@/lib/validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { recommendLeadFollowUp } from "@/lib/call-intelligence";
import { emitEvent, runAutomationEvent, writeAudit } from "@/lib/enterprise";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";
import { isTerminalLeadStatus, syncLeadFollowUp } from "@/lib/lead-mutation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Anmeldung momentan nicht überprüfbar. Bitte erneut versuchen." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
  if (!user) return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  try { await requirePermission(user, PORTAL_PERMISSION.LEAD_EDIT); }
  catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 403;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Keine Berechtigung." }, { status: Number.isFinite(status) ? status : 403 });
  }

  const { id: rawId } = await ctx.params;
  const leadId = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(leadId) || leadId <= 0 || leadId > 2147483647) {
    return NextResponse.json({ ok: false, error: "Ungültige Lead-ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }

  const parsed = leadCallActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bitte Anrufdaten vollständig und korrekt eintragen." }, { status: 422 });
  }

  const data = parsed.data;
  const now = new Date();
  const calledAt = data.calledAt ? new Date(data.calledAt) : now;
  const requestedCallbackAt = data.requestedCallbackAt ? new Date(data.requestedCallbackAt) : null;

  if (!Number.isFinite(calledAt.getTime()) || calledAt.getTime() > now.getTime() + 5 * 60_000 || calledAt.getTime() < now.getTime() - 365 * 24 * 60 * 60_000) {
    return NextResponse.json({ ok: false, error: "Die Anrufzeit ist nicht plausibel." }, { status: 422 });
  }
  if (requestedCallbackAt && (!Number.isFinite(requestedCallbackAt.getTime()) || requestedCallbackAt.getTime() <= calledAt.getTime())) {
    return NextResponse.json({ ok: false, error: "Der gewünschte Rückruf muss nach dem dokumentierten Anruf liegen." }, { status: 422 });
  }

  try {
    return await db.transaction(async (tx) => {
      const [lead] = await tx
        .select()
        .from(leads)
        .where(and(eq(leads.id, leadId), leadAccessCondition(user)))
        .limit(1)
        .for("update");

      if (!lead) return NextResponse.json({ ok: false, error: "Lead nicht gefunden." }, { status: 404 });

      const [attemptRow] = await tx
        .select({ total: count() })
        .from(leadCallActivities)
        .where(eq(leadCallActivities.leadId, leadId));
      const attemptNumber = Number(attemptRow?.total ?? 0) + 1;

      const recommendation = recommendLeadFollowUp({
        calledAt,
        reachedPerson: data.reachedPerson,
        reaction: data.reaction,
        attemptNumber,
        requestedCallbackAt,
      });

      const explicitDoNotContact = data.reaction === "do_not_contact";
      const terminalLead = isTerminalLeadStatus(lead.status) || explicitDoNotContact;
      const latestContact = !lead.lastContactAt || calledAt.getTime() >= lead.lastContactAt.getTime();
      const shouldSchedule = !terminalLead && latestContact && data.autoSchedule && recommendation.action === "call_again" && Boolean(recommendation.at);
      const stopAutoFollowUp = terminalLead || (latestContact && data.autoSchedule && recommendation.action === "no_auto_call");
      const nextActionAt = shouldSchedule ? recommendation.at : stopAutoFollowUp ? null : lead.nextActionAt;

      const patch: Partial<typeof leads.$inferInsert> = {
        updatedAt: now,
        ...(latestContact ? { lastContactAt: calledAt, contactOutcome: recommendation.contactOutcome } : {}),
      };

      if (lead.status === "neu" && latestContact) patch.status = "kontaktiert";
      if (shouldSchedule || stopAutoFollowUp) patch.nextActionAt = nextActionAt;
      if (latestContact && data.reaction === "very_interested" && !["high", "hot"].includes(lead.priority)) patch.priority = "high";
      if (explicitDoNotContact) {
        // A contact objection must stop further calls without losing a won deal.
        if (lead.status !== "abgeschlossen") patch.status = "verloren";
        patch.closedAt = lead.closedAt ?? now;
        patch.nextActionAt = null;
        patch.contactOutcome = recommendation.contactOutcome;
        if (lead.status !== "abgeschlossen") {
          patch.confirmedAt = null;
          patch.confirmedSlot = null;
        }
      }

      await tx.update(leads).set(patch).where(eq(leads.id, leadId));

      await tx.insert(leadCallActivities).values({
        leadId,
        employeeId: user.id,
        calledAt,
        reachedPerson: data.reachedPerson,
        reaction: data.reaction,
        outcome: recommendation.contactOutcome,
        attemptNumber,
        note: data.note,
        requestedCallbackAt,
        suggestedFollowUpAt: recommendation.at,
        suggestionReason: recommendation.reason,
        recommendedAction: recommendation.action,
        autoScheduled: shouldSchedule,
      });

      const leadLabel = lead.name || lead.email || lead.phone || `Lead #${lead.id}`;
      const taskOwner = lead.assignedEmployeeId ?? lead.createdByEmployeeId ?? user.id;

      if (shouldSchedule || stopAutoFollowUp) {
        await syncLeadFollowUp(tx, {
          leadId,
          actorId: user.id,
          ownerId: taskOwner,
          title: `Lead nachfassen: ${leadLabel}`,
          description: recommendation.reason,
          priority: patch.priority ?? lead.priority,
          dueAt: nextActionAt,
          now,
        });
      }

      await writeAudit(tx, user.id, "lead.call.logged", "lead", leadId, undefined, {
        calledAt: calledAt.toISOString(),
        reachedPerson: data.reachedPerson,
        reaction: data.reaction,
        attemptNumber,
        recommendedAction: recommendation.action,
        suggestedFollowUpAt: recommendation.at?.toISOString() ?? null,
        autoScheduled: shouldSchedule,
      });

      if (patch.status && patch.status !== lead.status) {
        const payload = {
          assignedEmployeeId: lead.assignedEmployeeId ?? lead.createdByEmployeeId ?? user.id,
          previousStatus: lead.status,
          status: patch.status,
        };
        await emitEvent(tx, `lead.status.${patch.status}`, "lead", leadId, payload);
        await runAutomationEvent(tx, `lead.status.${patch.status}`, "lead", leadId, payload, user.id);
      }

      await emitEvent(tx, "lead.call.logged", "lead", leadId, {
        employeeId: user.id,
        attemptNumber,
        reachedPerson: data.reachedPerson,
        reaction: data.reaction,
        contactOutcome: recommendation.contactOutcome,
        suggestedFollowUpAt: recommendation.at?.toISOString() ?? null,
        autoScheduled: shouldSchedule,
      });

      return NextResponse.json({
        ok: true,
        attemptNumber,
        recommendation: {
          at: recommendation.at?.toISOString() ?? null,
          reason: recommendation.reason,
          action: recommendation.action,
          autoScheduled: shouldSchedule,
          contactOutcome: recommendation.contactOutcome,
          priority: patch.priority ?? lead.priority,
        },
      });
    });
  } catch (error) {
    console.error("[portal/lead-call POST] Speichern fehlgeschlagen.", error);
    return NextResponse.json({ ok: false, error: "Anruf konnte nicht gespeichert werden." }, { status: 500 });
  }
}
