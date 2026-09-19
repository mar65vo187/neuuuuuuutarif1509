import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { teamMembers, teams } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";
import { teamMutationSchema } from "@/lib/operations-validation";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = teamMutationSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Teamdaten ungültig." }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      if (parsed.data.action === "create") {
        if (parsed.data.leadEmployeeId) {
          const [lead] = await tx.select({ id: employees.id }).from(employees).where(eq(employees.id, parsed.data.leadEmployeeId)).limit(1);
          if (!lead) throw new Error("EMPLOYEE_NOT_FOUND");
        }
        const [created] = await tx.insert(teams).values({
          name: parsed.data.name,
          leadEmployeeId: parsed.data.leadEmployeeId ?? null,
        }).returning({ id: teams.id });
        await writeAudit(tx, admin.id, "team.created", "team", created.id, undefined, { name: parsed.data.name });
        return created;
      }

      const [employee] = await tx.select({ id: employees.id }).from(employees).where(eq(employees.id, parsed.data.employeeId)).limit(1);
      const [team] = await tx.select({ id: teams.id }).from(teams).where(eq(teams.id, parsed.data.teamId)).limit(1);
      if (!employee || !team) throw new Error("EMPLOYEE_NOT_FOUND");
      await tx.delete(teamMembers).where(eq(teamMembers.employeeId, parsed.data.employeeId));
      const [created] = await tx.insert(teamMembers).values({
        teamId: parsed.data.teamId,
        employeeId: parsed.data.employeeId,
      }).returning({ id: teamMembers.id });
      await writeAudit(tx, admin.id, "team.member_assigned", "team", parsed.data.teamId, undefined, { employeeId: parsed.data.employeeId });
      return created;
    });
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMPLOYEE_NOT_FOUND") return NextResponse.json({ ok: false, error: "Team oder Mitarbeiter nicht gefunden." }, { status: 404 });
    return adminFailure(error);
  }
}
