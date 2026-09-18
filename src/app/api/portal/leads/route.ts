import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { advisors, leadNotes, leads } from "@/db/schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { leadSchema } from "@/lib/validation";
import { emitEvent, runAutomationEvent, writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." }, { status: error instanceof RequestBodyError ? error.status : 400 });
  }

  const parsed = leadSchema.safeParse({ ...(body as object), consent: true, source: "portal" });
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte die Eingaben prüfen." }, { status: 422 });
  const data = parsed.data;

  try {
    let advisorId: number | null = null;
    if (data.advisorSlug) {
      const [advisor] = await db.select({ id: advisors.id }).from(advisors).where(and(eq(advisors.slug, data.advisorSlug), eq(advisors.active, true))).limit(1);
      if (!advisor) return NextResponse.json({ ok: false, error: "Der ausgewählte Berater ist nicht verfügbar." }, { status: 422 });
      advisorId = advisor.id;
    }
    const created = await db.transaction(async (tx) => {
      const [lead] = await tx.insert(leads).values({
        type: data.type,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        topic: data.topic || null,
        region: data.region || null,
        situation: data.situation || null,
        message: data.message || null,
        preferredChannel: data.preferredChannel || null,
        preferredTime: data.preferredTime || null,
        advisorId,
        assignedEmployeeId: user.id,
        source: "portal",
      }).returning({ id: leads.id });
      await tx.insert(leadNotes).values({ leadId: lead.id, employeeId: user.id, kind: "system", body: `${user.name} hat den Lead im Mitarbeiterportal angelegt.` });
      await writeAudit(tx, user.id, "lead.created", "lead", lead.id, undefined, { source: "portal", type: data.type });
      await emitEvent(tx, "lead.created", "lead", lead.id, { assignedEmployeeId: user.id, source: "portal" });
      await runAutomationEvent(tx, "lead.created", "lead", lead.id, { assignedEmployeeId: user.id, source: "portal" }, user.id);
      return lead;
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    console.error("[portal/leads] insert failed");
    return NextResponse.json({ ok: false, error: "Der Lead konnte gerade nicht gespeichert werden." }, { status: 503 });
  }
}