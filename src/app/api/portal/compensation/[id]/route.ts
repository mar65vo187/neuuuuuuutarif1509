import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { compensationHistory, employeeCompensationProfiles } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { COMPENSATION_TIERS, DEFAULT_LOYALTY_YEARS, DEFAULT_RESERVE_PERCENT, isCompensationOwner } from "@/lib/compensation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedPayouts = COMPENSATION_TIERS.map((tier) => tier.percent);
const schema = z.object({
  payoutPercent: z.number().refine((value) => allowedPayouts.includes(value as (typeof allowedPayouts)[number]), "Ungültige Provisionsstufe."),
  savingsPercent: z.number().min(0).max(20),
  loyaltyStartedAt: z.string().datetime(),
  teamLevel: z.enum(["berater", "senior", "builder", "teamlead"]),
  note: z.string().trim().max(2000).default(""),
  reason: z.string().trim().min(3, "Bitte die Änderung kurz begründen.").max(500),
}).strict();

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Diese Anfrage ist nicht zulässig." }, { status: 403 });
  }

  const owner = await getCurrentUser().catch(() => null);
  if (!owner) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  if (!isCompensationOwner(owner)) {
    return NextResponse.json({ ok: false, error: "Nur der hinterlegte Owner-Account darf Vergütungsstufen verändern." }, { status: 403 });
  }

  const rawId = (await context.params).id;
  const employeeId = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ ok: false, error: "Ungültige Mitarbeiter-ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 8192);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte die Eingaben prüfen." }, { status: 422 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [employee] = await tx.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.id, employeeId)).limit(1).for("update");
      if (!employee) throw Object.assign(new Error("Mitarbeiter nicht gefunden."), { status: 404 });

      const [oldProfile] = await tx.select().from(employeeCompensationProfiles).where(eq(employeeCompensationProfiles.employeeId, employeeId)).limit(1);
      const values = {
        employeeId,
        payoutPercent: String(parsed.data.payoutPercent),
        reservePercent: String(DEFAULT_RESERVE_PERCENT),
        savingsPercent: String(parsed.data.savingsPercent),
        loyaltyStartedAt: new Date(parsed.data.loyaltyStartedAt),
        loyaltyVestingYears: DEFAULT_LOYALTY_YEARS,
        teamLevel: parsed.data.teamLevel,
        note: parsed.data.note,
        updatedByEmployeeId: owner.id,
        updatedAt: new Date(),
      };

      const [profile] = await tx.insert(employeeCompensationProfiles).values(values)
        .onConflictDoUpdate({
          target: employeeCompensationProfiles.employeeId,
          set: {
            payoutPercent: values.payoutPercent,
            reservePercent: values.reservePercent,
            savingsPercent: values.savingsPercent,
            loyaltyStartedAt: values.loyaltyStartedAt,
            loyaltyVestingYears: values.loyaltyVestingYears,
            teamLevel: values.teamLevel,
            note: values.note,
            updatedByEmployeeId: owner.id,
            updatedAt: values.updatedAt,
          },
        })
        .returning();

      await tx.insert(compensationHistory).values({
        employeeId,
        changedByEmployeeId: owner.id,
        oldValues: oldProfile ? {
          payoutPercent: oldProfile.payoutPercent,
          savingsPercent: oldProfile.savingsPercent,
          loyaltyStartedAt: oldProfile.loyaltyStartedAt.toISOString(),
          teamLevel: oldProfile.teamLevel,
          note: oldProfile.note,
        } : null,
        newValues: {
          payoutPercent: profile.payoutPercent,
          reservePercent: profile.reservePercent,
          savingsPercent: profile.savingsPercent,
          loyaltyStartedAt: profile.loyaltyStartedAt.toISOString(),
          loyaltyVestingYears: profile.loyaltyVestingYears,
          teamLevel: profile.teamLevel,
          note: profile.note,
        },
        reason: parsed.data.reason,
      });

      return { employee, profile };
    });

    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 503;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen." }, { status });
  }
}
