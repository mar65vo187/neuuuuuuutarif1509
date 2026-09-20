import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import {
  benefitPoolLedger,
  commissionEvents,
  employeeBenefits,
  employeeTrainingCompletions,
  incentiveCampaigns,
  internalDocuments,
  orders,
  products,
  providers,
  reconciliationImports,
  reconciliationIssues,
  teamMembers,
  teams,
  trainingModules,
} from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";
import { isCompensationOwner } from "@/lib/compensation";

export async function getOperationsHubData(user: SessionUser) {
  const owner = isCompensationOwner(user);
  const admin = user.role === "admin";
  const now = new Date();

  const [teamRows, memberRows, incentiveRows, moduleRows, completionRows, benefitRows, documentRows] = await Promise.all([
    db.select({
      id: teams.id,
      name: teams.name,
      leadEmployeeId: teams.leadEmployeeId,
      leadName: employees.name,
      active: teams.active,
    }).from(teams).leftJoin(employees, eq(teams.leadEmployeeId, employees.id)).where(eq(teams.active, true)).orderBy(teams.name),
    db.select({
      teamId: teamMembers.teamId,
      employeeId: teamMembers.employeeId,
      name: employees.name,
      email: employees.email,
      active: employees.active,
    }).from(teamMembers).innerJoin(employees, eq(teamMembers.employeeId, employees.id)).where(eq(employees.active, true)).orderBy(employees.name),
    db.select().from(incentiveCampaigns).where(eq(incentiveCampaigns.active, true)).orderBy(desc(incentiveCampaigns.startsAt)).limit(100),
    db.select({
      id: trainingModules.id,
      title: trainingModules.title,
      category: trainingModules.category,
      description: trainingModules.description,
      content: trainingModules.content,
      productId: trainingModules.productId,
      productName: products.name,
      required: trainingModules.required,
      validMonths: trainingModules.validMonths,
      active: trainingModules.active,
    }).from(trainingModules)
      .leftJoin(products, eq(trainingModules.productId, products.id))
      .where(eq(trainingModules.active, true))
      .orderBy(trainingModules.category, trainingModules.title),
    db.select({
      moduleId: employeeTrainingCompletions.moduleId,
      employeeId: employeeTrainingCompletions.employeeId,
      employeeName: employees.name,
      status: employeeTrainingCompletions.status,
      completedAt: employeeTrainingCompletions.completedAt,
      expiresAt: employeeTrainingCompletions.expiresAt,
      note: employeeTrainingCompletions.note,
      certificateCode: employeeTrainingCompletions.certificateCode,
    }).from(employeeTrainingCompletions)
      .innerJoin(employees, eq(employeeTrainingCompletions.employeeId, employees.id))
      .where(admin ? eq(employees.active, true) : eq(employeeTrainingCompletions.employeeId, user.id))
      .orderBy(desc(employeeTrainingCompletions.completedAt)),
    db.select({
      id: employeeBenefits.id,
      employeeId: employeeBenefits.employeeId,
      employeeName: employees.name,
      benefitKey: employeeBenefits.benefitKey,
      label: employeeBenefits.label,
      status: employeeBenefits.status,
      details: employeeBenefits.details,
      validFrom: employeeBenefits.validFrom,
      validTo: employeeBenefits.validTo,
    }).from(employeeBenefits)
      .innerJoin(employees, eq(employeeBenefits.employeeId, employees.id))
      .where(owner ? eq(employees.active, true) : eq(employeeBenefits.employeeId, user.id))
      .orderBy(employees.name, employeeBenefits.label),
    db.select({
      id: internalDocuments.id,
      category: internalDocuments.category,
      title: internalDocuments.title,
      fileName: internalDocuments.fileName,
      contentType: internalDocuments.contentType,
      digest: internalDocuments.digest,
      sizeBytes: internalDocuments.sizeBytes,
      version: internalDocuments.version,
      productId: internalDocuments.productId,
      productName: products.name,
      providerId: internalDocuments.providerId,
      providerName: providers.name,
      visibility: internalDocuments.visibility,
      createdAt: internalDocuments.createdAt,
    }).from(internalDocuments)
      .leftJoin(products, eq(internalDocuments.productId, products.id))
      .leftJoin(providers, eq(internalDocuments.providerId, providers.id))
      .where(and(
        eq(internalDocuments.active, true),
        owner
          ? sql`true`
          : admin
            ? inArray(internalDocuments.visibility, ["team", "admin"])
            : eq(internalDocuments.visibility, "team"),
      ))
      .orderBy(desc(internalDocuments.createdAt))
      .limit(300),
  ]);

  const visibleIncentives = admin
    ? incentiveRows
    : incentiveRows.filter((campaign) => {
        if (campaign.audience === "all") return true;
        if (campaign.audience.startsWith("employee:")) return Number(campaign.audience.slice("employee:".length)) === user.id;
        if (campaign.audience.startsWith("team:")) {
          const teamId = Number(campaign.audience.slice("team:".length));
          return memberRows.some((member) => member.teamId === teamId && member.employeeId === user.id);
        }
        return false;
      });

  function targetEmployeeIds(audience: string): number[] | null {
    if (audience === "all") return admin ? null : [user.id];
    if (audience.startsWith("employee:")) return [Number(audience.slice("employee:".length))];
    if (audience.startsWith("team:")) {
      const teamId = Number(audience.slice("team:".length));
      return memberRows.filter((member) => member.teamId === teamId).map((member) => member.employeeId);
    }
    return [];
  }

  function audienceLabel(audience: string) {
    if (audience === "all") return "Alle";
    if (audience.startsWith("employee:")) {
      const employeeId = Number(audience.slice("employee:".length));
      return employeeRowsForAudience.find((employee) => employee.id === employeeId)?.name ?? "Mitarbeiter";
    }
    if (audience.startsWith("team:")) {
      const teamId = Number(audience.slice("team:".length));
      return teamRows.find((team) => team.id === teamId)?.name ?? "Team";
    }
    return "Zielgruppe";
  }

  const employeeRowsForAudience = await db.select({ id: employees.id, name: employees.name })
    .from(employees).where(eq(employees.active, true)).orderBy(employees.name);

  const incentiveProgress = await Promise.all(visibleIncentives.map(async (campaign) => {
    const starts = campaign.startsAt;
    const ends = campaign.endsAt;
    const targetIds = targetEmployeeIds(campaign.audience);
    const advisorCondition = targetIds === null
      ? sql`true`
      : targetIds.length
        ? inArray(orders.advisorEmployeeId, targetIds)
        : sql`false`;

    if (campaign.goalType === "commission") {
      const [row] = await db.select({
        value: sql<string>`coalesce(sum(coalesce(${commissionEvents.confirmedAmount}, 0)),0)::text`,
      }).from(commissionEvents)
        .innerJoin(orders, eq(commissionEvents.orderId, orders.id))
        .where(and(
          advisorCondition,
          gte(orders.createdAt, starts),
          lte(orders.createdAt, ends),
          inArray(orders.status, ["accepted", "activation_pending", "active"]),
        ));
      return { campaignId: campaign.id, value: Number(row?.value ?? 0) };
    }

    const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(orders)
      .where(and(
        advisorCondition,
        gte(orders.createdAt, starts),
        lte(orders.createdAt, ends),
        inArray(orders.status, ["accepted", "activation_pending", "active"]),
      ));
    return { campaignId: campaign.id, value: Number(row?.value ?? 0) };
  }));

  const employeeRows = admin
    ? await db.select({ id: employees.id, name: employees.name, email: employees.email }).from(employees).where(eq(employees.active, true)).orderBy(employees.name)
    : [{ id: user.id, name: user.name, email: user.email }];

  let productRows: Array<{ id: number; name: string; providerId: number }> = [];
  let providerRows: Array<{ id: number; name: string }> = [];
  if (admin) {
    [productRows, providerRows] = await Promise.all([
      db.select({ id: products.id, name: products.name, providerId: products.providerId }).from(products).where(eq(products.active, true)).orderBy(products.name),
      db.select({ id: providers.id, name: providers.name }).from(providers).where(eq(providers.active, true)).orderBy(providers.name),
    ]);
  }

  let ownerCockpit: null | {
    providerGross: number;
    confirmed: number;
    paid: number;
    storno: number;
    poolBalance: number;
    activeIncentives: number;
    teamCount: number;
    openReconciliation: number;
    imports: Array<{ id: number; providerName: string; sourceName: string; rowCount: number; matchedCount: number; issueCount: number; createdAt: Date }>;
  } = null;

  let reconciliation: Array<{
    id: number;
    providerId: number | null;
    type: string;
    status: string;
    expectedAmount: string | null;
    reportedAmount: string | null;
    differenceAmount: string | null;
    reference: string | null;
    note: string | null;
    createdAt: Date;
  }> = [];

  if (owner) {
    reconciliation = await db.select({
      id: reconciliationIssues.id,
      providerId: reconciliationIssues.providerId,
      type: reconciliationIssues.type,
      status: reconciliationIssues.status,
      expectedAmount: reconciliationIssues.expectedAmount,
      reportedAmount: reconciliationIssues.reportedAmount,
      differenceAmount: reconciliationIssues.differenceAmount,
      reference: reconciliationIssues.reference,
      note: reconciliationIssues.note,
      createdAt: reconciliationIssues.createdAt,
    }).from(reconciliationIssues).where(eq(reconciliationIssues.status, "open")).orderBy(desc(reconciliationIssues.createdAt)).limit(100);
  }

  if (owner) {
    const [commission, stornoRow, poolRows, importRows] = await Promise.all([
      db.select({
        gross: sql<string>`coalesce(sum(coalesce(${commissionEvents.expectedAmount},0)),0)::text`,
        confirmed: sql<string>`coalesce(sum(coalesce(${commissionEvents.confirmedAmount},0)),0)::text`,
        paid: sql<string>`coalesce(sum(coalesce(${commissionEvents.paidAmount},0)),0)::text`,
      }).from(commissionEvents),
      db.select({ value: sql<number>`count(*)::int` }).from(orders).where(or(eq(orders.status, "storno"), eq(orders.status, "cancelled"))),
      db.select({
        entryType: benefitPoolLedger.entryType,
        total: sql<string>`coalesce(sum(${benefitPoolLedger.amount}),0)::text`,
      }).from(benefitPoolLedger).groupBy(benefitPoolLedger.entryType),
      db.select({
        id: reconciliationImports.id,
        providerName: providers.name,
        sourceName: reconciliationImports.sourceName,
        rowCount: reconciliationImports.rowCount,
        matchedCount: reconciliationImports.matchedCount,
        issueCount: reconciliationImports.issueCount,
        createdAt: reconciliationImports.createdAt,
      }).from(reconciliationImports)
        .innerJoin(providers, eq(reconciliationImports.providerId, providers.id))
        .orderBy(desc(reconciliationImports.createdAt)).limit(20),
    ]);
    const poolMap = new Map(poolRows.map((row) => [row.entryType, Number(row.total)]));
    const credits = (poolMap.get("credit") ?? 0) + (poolMap.get("release") ?? 0) + (poolMap.get("correction") ?? 0);
    const debits = (poolMap.get("spend") ?? 0) + (poolMap.get("reserve") ?? 0);
    ownerCockpit = {
      providerGross: Number(commission[0]?.gross ?? 0),
      confirmed: Number(commission[0]?.confirmed ?? 0),
      paid: Number(commission[0]?.paid ?? 0),
      storno: Number(stornoRow[0]?.value ?? 0),
      poolBalance: Math.max(0, credits - debits),
      activeIncentives: incentiveRows.filter((row) => row.startsAt <= now && row.endsAt >= now).length,
      teamCount: teamRows.length,
      openReconciliation: reconciliation.length,
      imports: importRows,
    };
  }

  return {
    owner,
    admin,
    teams: teamRows.map((team) => ({ ...team, members: memberRows.filter((member) => member.teamId === team.id) })),
    incentives: visibleIncentives.map((campaign) => ({
      ...campaign,
      audienceLabel: audienceLabel(campaign.audience),
      progress: incentiveProgress.find((row) => row.campaignId === campaign.id)?.value ?? 0,
    })),
    training: moduleRows,
    completions: completionRows,
    benefits: benefitRows,
    documents: documentRows,
    employees: employeeRows,
    products: productRows,
    providers: providerRows,
    reconciliation,
    ownerCockpit,
  };
}
