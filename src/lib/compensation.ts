import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { commissionEvents, employeeCompensationProfiles, loyaltyBonusLedger, teamMembers, teams } from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export { COMPENSATION_TIERS, TEAM_LEVELS, DEFAULT_PAYOUT_PERCENT, DEFAULT_RESERVE_PERCENT, DEFAULT_LOYALTY_YEARS } from "@/lib/compensation-model";
import { COMPENSATION_TIERS, DEFAULT_PAYOUT_PERCENT, DEFAULT_RESERVE_PERCENT, DEFAULT_LOYALTY_YEARS } from "@/lib/compensation-model";

function ownerEmail() {
  return (process.env.PORTAL_OWNER_EMAIL || process.env.PORTAL_ADMIN_EMAIL || "").trim().toLowerCase();
}

export function isCompensationOwner(user: SessionUser) {
  const email = ownerEmail();
  return Boolean(email) && user.role === "admin" && user.email.trim().toLowerCase() === email;
}

export function compensationTier(percent: number) {
  return COMPENSATION_TIERS.find((tier) => tier.percent === percent) ?? COMPENSATION_TIERS[0];
}

export type CompensationRow = {
  employeeId: number;
  name: string;
  email: string;
  imageUrl: string | null;
  role: "admin" | "berater";
  payoutPercent: number;
  reservePercent: number;
  savingsPercent: number;
  loyaltyStartedAt: Date;
  loyaltyVestingYears: number;
  teamLevel: string;
  note: string;
  providerGross: number;
  confirmedGross: number;
  paidGross: number;
  employeeExpected: number;
  employeeConfirmed: number;
  employeePaid: number;
  reserveAmount: number;
  companyOperatingAmount: number;
  savingsProjection: number;
  loyaltyEligibleAt: Date;
  loyaltyCredits: number;
  loyaltyPayouts: number;
  loyaltyBalance: number;
};

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export type CompensationScope = "auto" | "self" | "team" | "all";

export async function getCompensationRows(user: SessionUser, requestedScope: CompensationScope = "auto"): Promise<CompensationRow[]> {
  const owner = isCompensationOwner(user);
  const capabilities = await permissionSnapshot(user, [
    PORTAL_PERMISSION.COMMISSION_READ_SELF,
    PORTAL_PERMISSION.COMMISSION_READ_TEAM,
    PORTAL_PERMISSION.COMMISSION_READ_ALL,
  ] as const);
  const scope = requestedScope === "auto" ? (owner ? "all" : "self") : requestedScope;
  const canReadAll = owner || capabilities[PORTAL_PERMISSION.COMMISSION_READ_ALL];
  const canReadTeam = canReadAll || capabilities[PORTAL_PERMISSION.COMMISSION_READ_TEAM];
  const canReadSelf = canReadTeam || capabilities[PORTAL_PERMISSION.COMMISSION_READ_SELF];
  if (
    (scope === "all" && !canReadAll)
    || (scope === "team" && !canReadTeam)
    || (scope === "self" && !canReadSelf)
  ) {
    const error = new Error("Keine Berechtigung für diese Provisionssicht.");
    Object.assign(error, { status: 403 });
    throw error;
  }

  let visibleEmployeeIds: number[] | null = scope === "all" ? null : [user.id];
  if (scope === "team") {
    const teamRows = await db.select({ id: teams.id })
      .from(teams)
      .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
      .where(and(
        eq(teams.active, true),
        or(eq(teams.leadEmployeeId, user.id), eq(teamMembers.employeeId, user.id)),
      ));
    const teamIds = Array.from(new Set(teamRows.map((row) => row.id)));
    if (teamIds.length) {
      const members = await db.select({ employeeId: teamMembers.employeeId })
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, teamIds));
      visibleEmployeeIds = Array.from(new Set([user.id, ...members.map((row) => row.employeeId)]));
    }
  }

  const people = await db
    .select({
      employeeId: employees.id,
      name: employees.name,
      email: employees.email,
      imageUrl: employees.imageUrl,
      role: employees.role,
      payoutPercent: employeeCompensationProfiles.payoutPercent,
      reservePercent: employeeCompensationProfiles.reservePercent,
      savingsPercent: employeeCompensationProfiles.savingsPercent,
      loyaltyStartedAt: employeeCompensationProfiles.loyaltyStartedAt,
      loyaltyVestingYears: employeeCompensationProfiles.loyaltyVestingYears,
      teamLevel: employeeCompensationProfiles.teamLevel,
      note: employeeCompensationProfiles.note,
    })
    .from(employees)
    .leftJoin(employeeCompensationProfiles, eq(employeeCompensationProfiles.employeeId, employees.id))
    .where(visibleEmployeeIds === null
      ? eq(employees.active, true)
      : and(eq(employees.active, true), inArray(employees.id, visibleEmployeeIds)))
    .orderBy(employees.name);

  if (!people.length) return [];
  const ids = people.map((person) => person.employeeId);
  const commissionRows = await db
    .select({
      employeeId: commissionEvents.employeeId,
      providerGross: sql<string>`coalesce(sum(coalesce(${commissionEvents.confirmedAmount}, ${commissionEvents.expectedAmount}, 0)), 0)::text`,
      confirmedGross: sql<string>`coalesce(sum(coalesce(${commissionEvents.confirmedAmount}, 0)), 0)::text`,
      paidGross: sql<string>`coalesce(sum(coalesce(${commissionEvents.paidAmount}, 0)), 0)::text`,
    })
    .from(commissionEvents)
    .where(inArray(commissionEvents.employeeId, ids))
    .groupBy(commissionEvents.employeeId);

  const loyaltyRows = await db
    .select({
      employeeId: loyaltyBonusLedger.employeeId,
      credits: sql<string>`coalesce(sum(case when ${loyaltyBonusLedger.type} = 'credit' then ${loyaltyBonusLedger.amount} else 0 end), 0)::text`,
      payouts: sql<string>`coalesce(sum(case when ${loyaltyBonusLedger.type} in ('payout','correction_debit') then ${loyaltyBonusLedger.amount} else 0 end), 0)::text`,
    })
    .from(loyaltyBonusLedger)
    .where(inArray(loyaltyBonusLedger.employeeId, ids))
    .groupBy(loyaltyBonusLedger.employeeId);

  const commissions = new Map(commissionRows.map((row) => [row.employeeId, row]));
  const loyalty = new Map(loyaltyRows.map((row) => [row.employeeId, row]));
  return people.map((person) => {
    const payoutPercent = Number(person.payoutPercent ?? DEFAULT_PAYOUT_PERCENT);
    const reservePercent = Number(person.reservePercent ?? DEFAULT_RESERVE_PERCENT);
    const savingsPercent = Number(person.savingsPercent ?? 0);
    const loyaltyVestingYears = person.loyaltyVestingYears ?? DEFAULT_LOYALTY_YEARS;
    const loyaltyStartedAt = person.loyaltyStartedAt ?? new Date();
    const amounts = commissions.get(person.employeeId);
    const providerGross = Number(amounts?.providerGross ?? 0);
    const confirmedGross = Number(amounts?.confirmedGross ?? 0);
    const paidGross = Number(amounts?.paidGross ?? 0);
    const employeeExpected = providerGross * payoutPercent / 100;
    const employeeConfirmed = confirmedGross * payoutPercent / 100;
    const employeePaid = paidGross * payoutPercent / 100;
    const loyaltyAmounts = loyalty.get(person.employeeId);
    const loyaltyCredits = Number(loyaltyAmounts?.credits ?? 0);
    const loyaltyPayouts = Number(loyaltyAmounts?.payouts ?? 0);
    return {
      employeeId: person.employeeId,
      name: person.name,
      email: person.email,
      imageUrl: person.imageUrl,
      role: person.role,
      payoutPercent,
      reservePercent,
      savingsPercent,
      loyaltyStartedAt,
      loyaltyVestingYears,
      teamLevel: person.teamLevel ?? "berater",
      note: owner ? (person.note ?? "") : "",
      providerGross: owner ? providerGross : 0,
      confirmedGross: owner ? confirmedGross : 0,
      paidGross: owner ? paidGross : 0,
      employeeExpected,
      employeeConfirmed,
      employeePaid,
      reserveAmount: owner ? providerGross * reservePercent / 100 : 0,
      companyOperatingAmount: owner ? Math.max(0, providerGross * (100 - payoutPercent - reservePercent) / 100) : 0,
      savingsProjection: providerGross * savingsPercent / 100,
      loyaltyEligibleAt: addYears(loyaltyStartedAt, loyaltyVestingYears),
      loyaltyCredits,
      loyaltyPayouts,
      loyaltyBalance: Math.max(0, loyaltyCredits - loyaltyPayouts),
    };
  });
}
