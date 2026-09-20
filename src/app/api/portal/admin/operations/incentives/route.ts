import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { incentiveCampaigns, teams } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { isCompensationOwner } from "@/lib/compensation";
import { writeAudit } from "@/lib/enterprise";
import { incentiveCreateSchema } from "@/lib/operations-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    if (!isCompensationOwner(admin)) return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf Incentives anlegen." }, { status: 403 });
    const parsed = incentiveCreateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Incentive ungültig." }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);

      if (parsed.data.audience.startsWith("employee:")) {
        const employeeId = Number(parsed.data.audience.slice("employee:".length));
        const [employee] = await tx.select({ id: employees.id }).from(employees)
          .where(and(eq(employees.id, employeeId), eq(employees.active, true))).limit(1);
        if (!employee) throw new Error("AUDIENCE_NOT_FOUND");
      }
      if (parsed.data.audience.startsWith("team:")) {
        const teamId = Number(parsed.data.audience.slice("team:".length));
        const [team] = await tx.select({ id: teams.id }).from(teams)
          .where(and(eq(teams.id, teamId), eq(teams.active, true))).limit(1);
        if (!team) throw new Error("AUDIENCE_NOT_FOUND");
      }
      if (parsed.data.goalType === "team_orders" && !parsed.data.audience.startsWith("team:")) {
        throw new Error("TEAM_AUDIENCE_REQUIRED");
      }

      const [created] = await tx.insert(incentiveCampaigns).values({
        title: parsed.data.title,
        description: parsed.data.description || "",
        goalType: parsed.data.goalType,
        goalValue: String(parsed.data.goalValue),
        rewardType: parsed.data.rewardType,
        rewardDescription: parsed.data.rewardDescription,
        budget: parsed.data.budget === null || parsed.data.budget === undefined ? null : String(parsed.data.budget),
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        audience: parsed.data.audience,
        createdByEmployeeId: admin.id,
      }).returning({ id: incentiveCampaigns.id });
      await writeAudit(tx, admin.id, "incentive.created", "incentive", created.id, undefined, { title: parsed.data.title, goalType: parsed.data.goalType, goalValue: parsed.data.goalValue });
      return created;
    });
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "AUDIENCE_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Mitarbeiter oder Team der Zielgruppe wurde nicht gefunden." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "TEAM_AUDIENCE_REQUIRED") {
      return NextResponse.json({ ok: false, error: "Team-Abschlüsse benötigen ein konkretes Team als Zielgruppe." }, { status: 422 });
    }
    return adminFailure(error);
  }
}
