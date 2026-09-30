import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { advisorLicenses, advisors } from "@/db/schema";
import { adminFailure, AdminRequestError, authorizeAdmin, lockAdminMutation, positiveId, readAdminJson } from "@/lib/admin-server";
import { licenseInputSchema, REGISTERED_KINDS } from "@/lib/advisor-licenses";
import { writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Creates or replaces the active license of one kind for an advisor (older entry stays as history). */
export async function POST(request: NextRequest, context: Context) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const advisorId = positiveId((await context.params).id);
    const parsed = licenseInputSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte die Angaben prüfen." }, { status: 422 });
    }
    const input = parsed.data;
    const license = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [profile] = await tx.select({ id: advisors.id }).from(advisors).where(eq(advisors.id, advisorId)).for("update");
      if (!profile) throw new AdminRequestError("Beraterprofil nicht gefunden.", 404);
      const previous = await tx.update(advisorLicenses)
        .set({ active: false, updatedAt: new Date() })
        .where(and(eq(advisorLicenses.advisorId, advisorId), eq(advisorLicenses.kind, input.kind), eq(advisorLicenses.active, true)))
        .returning({ id: advisorLicenses.id });
      const [created] = await tx.insert(advisorLicenses).values({
        advisorId,
        kind: input.kind,
        status: input.status,
        holderName: input.holderName,
        businessAddress: input.businessAddress,
        registerNumber: REGISTERED_KINDS.includes(input.kind) ? input.registerNumber : (input.registerNumber || null),
        authority: input.authority,
        remuneration: input.remuneration,
        noHoldingsConfirmed: input.noHoldingsConfirmed,
      }).returning();
      await writeAudit(tx, admin.id, "advisor.license_saved", "advisor", advisorId,
        previous.length ? { replacedLicenseIds: previous.map((row) => row.id) } : undefined,
        { licenseId: created.id, kind: created.kind, status: created.status, registerNumber: created.registerNumber });
      return created;
    });
    return NextResponse.json({ ok: true, license });
  } catch (error) { return adminFailure(error); }
}

/** Deactivates a license (kept for the audit trail, no longer published). */
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const advisorId = positiveId((await context.params).id);
    const licenseId = positiveId(request.nextUrl.searchParams.get("licenseId") ?? "");
    await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const rows = await tx.update(advisorLicenses)
        .set({ active: false, updatedAt: new Date() })
        .where(and(eq(advisorLicenses.id, licenseId), eq(advisorLicenses.advisorId, advisorId), eq(advisorLicenses.active, true)))
        .returning({ id: advisorLicenses.id, kind: advisorLicenses.kind });
      if (!rows.length) throw new AdminRequestError("Erlaubnis nicht gefunden.", 404);
      await writeAudit(tx, admin.id, "advisor.license_removed", "advisor", advisorId, { licenseId, kind: rows[0].kind }, undefined);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return adminFailure(error); }
}
