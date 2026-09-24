import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { prospectContacts } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { writeAudit } from "@/lib/enterprise";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["parked", "contacted", "qualified", "archived"]).optional(),
  nextContactAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(3000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "Keine Änderung angegeben." });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try { await requirePermission(user, PORTAL_PERMISSION.LEAD_EDIT); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Keine Berechtigung." }, { status: 403 }); }

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ ok: false, error: "Kontakt nicht gefunden." }, { status: 404 });

  let body: unknown;
  try { body = await readJsonBody(request, 16 * 1024); }
  catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." }, { status: error instanceof RequestBodyError ? error.status : 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });

  try {
    const result = await db.transaction(async (tx) => {
      const [contact] = await tx.select().from(prospectContacts).where(eq(prospectContacts.id, id)).limit(1).for("update");
      if (!contact) throw new Error("CONTACT_NOT_FOUND");
      const owner = contact.ownerEmployeeId ?? contact.createdByEmployeeId;
      if (user.role !== "admin" && owner !== user.id) throw Object.assign(new Error("Keine Berechtigung für diesen Kontakt."), { status: 403 });
      if (contact.convertedLeadId || contact.status === "converted") throw Object.assign(new Error("Dieser Kontakt wurde bereits als Lead übernommen."), { status: 409 });

      const patch: Partial<typeof prospectContacts.$inferInsert> = { updatedAt: new Date() };
      if (parsed.data.status !== undefined) patch.status = parsed.data.status;
      if (parsed.data.nextContactAt !== undefined) patch.nextContactAt = parsed.data.nextContactAt ? new Date(parsed.data.nextContactAt) : null;
      if (parsed.data.note !== undefined) patch.note = parsed.data.note;

      await tx.update(prospectContacts).set(patch).where(eq(prospectContacts.id, id));
      await writeAudit(tx, user.id, "contact_pool.updated", "contact", id, {
        status: contact.status,
        nextContactAt: contact.nextContactAt?.toISOString() ?? null,
      }, {
        status: parsed.data.status ?? contact.status,
        nextContactAt: parsed.data.nextContactAt === undefined ? contact.nextContactAt?.toISOString() ?? null : parsed.data.nextContactAt,
      });
      return { status: parsed.data.status ?? contact.status };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTACT_NOT_FOUND") return NextResponse.json({ ok: false, error: "Kontakt nicht gefunden." }, { status: 404 });
    const status = typeof (error as { status?: unknown })?.status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Kontakt konnte nicht aktualisiert werden." }, { status });
  }
}
