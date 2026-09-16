import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { advisors, employees, leads } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { updateAccountSchema } from "@/lib/admin-validation";
import { accountSelection, adminFailure, lockAdminMutation, AdminRequestError, authorizeAdmin, positiveId, readAdminJson } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const id = positiveId((await context.params).id);
    const parsed = updateAccountSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte die Eingaben prüfen." }, { status: 422 });
    const { advisor, password, ...account } = parsed.data;
    if (id === admin.id && (!account.active || account.role !== "admin")) throw new AdminRequestError("Der eigene Administratorzugang kann hier nicht deaktiviert oder herabgestuft werden.", 422);
    const passwordHash = password ? hashPassword(password) : undefined;
    const user = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [existing] = await tx.select(accountSelection).from(employees).where(eq(employees.id, id)).limit(1);
      if (!existing) throw new AdminRequestError("Benutzer nicht gefunden.", 404);
      if (existing.active && existing.role === "admin" && (!account.active || account.role !== "admin")) {
        const [row] = await tx.select({ count: sql<number>`count(*)::int` }).from(employees).where(and(eq(employees.active, true), eq(employees.role, "admin")));
        if (row.count <= 1) throw new AdminRequestError("Mindestens ein aktiver Administrator muss erhalten bleiben.", 422);
      }
      let advisorId = existing.advisorId;
      if (advisor) {
        if (advisorId) await tx.update(advisors).set({ ...advisor, name: account.name }).where(eq(advisors.id, advisorId));
        else {
          const [created] = await tx.insert(advisors).values({ ...advisor, name: account.name }).returning({ id: advisors.id });
          advisorId = created.id;
        }
      } else if (advisorId) {
        throw new AdminRequestError("Ein bestehendes Beraterprofil bleibt zugeordnet. Über „Profil öffentlich sichtbar“ kann es ausgeblendet werden.", 422);
      }
      const [updated] = await tx.update(employees).set({ ...account, advisorId, ...(passwordHash ? { passwordHash } : {}) }).where(eq(employees.id, id)).returning(accountSelection);
      return updated;
    });
    return NextResponse.json({ ok: true, user, signInAgain: id === admin.id && Boolean(password) });
  } catch (error) { return adminFailure(error); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const id = positiveId((await context.params).id);
    if (id === admin.id) throw new AdminRequestError("Der eigene Administratorzugang kann nicht gelöscht werden.", 422);
    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [existing] = await tx.select(accountSelection).from(employees).where(eq(employees.id, id)).limit(1).for("update");
      if (!existing) throw new AdminRequestError("Benutzer nicht gefunden.", 404);
      if (existing.active && existing.role === "admin") {
        const [row] = await tx.select({ count: sql<number>`count(*)::int` }).from(employees).where(and(eq(employees.active, true), eq(employees.role, "admin")));
        if (row.count <= 1) throw new AdminRequestError("Mindestens ein aktiver Administrator muss erhalten bleiben.", 422);
      }
      let profileDeleted = false;
      if (existing.advisorId) {
        // Lock before finding related records so concurrent FK inserts cannot create orphaned leads.
        await tx.select({ id: advisors.id }).from(advisors).where(eq(advisors.id, existing.advisorId)).for("update");
        const linkedAccounts = await tx.select({ id: employees.id }).from(employees).where(eq(employees.advisorId, existing.advisorId));
        profileDeleted = linkedAccounts.length === 1;
        if (profileDeleted) {
          await tx.update(leads).set({ assignedEmployeeId: admin.id, updatedAt: new Date() }).where(and(eq(leads.advisorId, existing.advisorId), isNull(leads.assignedEmployeeId)));
        }
      }
      // Keep customer records private and actionable instead of making them unassigned.
      await tx.update(leads).set({ assignedEmployeeId: admin.id, updatedAt: new Date() }).where(eq(leads.assignedEmployeeId, id));
      await tx.delete(employees).where(eq(employees.id, id));
      if (profileDeleted && existing.advisorId) await tx.delete(advisors).where(eq(advisors.id, existing.advisorId));
      return { profileDeleted };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) { return adminFailure(error); }
}
