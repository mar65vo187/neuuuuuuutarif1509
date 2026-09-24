import { createHash } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import {
  customers,
  optimizationContracts,
  optimizationDocuments,
  optimizationGoals,
  optimizationMemberships,
  optimizationOffers,
} from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";
import { emitEvent, writeAudit } from "@/lib/enterprise";
import { OPTIMIZATION_CATEGORIES, OPTIMIZATION_MEMBERSHIP_PRICE_CENTS, OPTIMIZATION_PLAN_CODE } from "@/lib/optimization-shared";


function customerAccess(user: SessionUser) {
  return user.role === "admin" ? sql`true` : eq(customers.ownerEmployeeId, user.id);
}

function customerNameSql() {
  return sql<string>`coalesce(nullif(${customers.companyName}, ''), nullif(trim(concat_ws(' ', ${customers.firstName}, ${customers.lastName})), ''), ${customers.customerNumber})`;
}

function cents(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw Object.assign(new Error("Betrag ist ungültig."), { status: 422 });
  return Math.round(parsed);
}

function text(value: unknown, max: number, required = false) {
  const parsed = typeof value === "string" ? value.trim() : "";
  if (required && !parsed) throw Object.assign(new Error("Pflichtfeld fehlt."), { status: 422 });
  if (parsed.length > max) throw Object.assign(new Error("Eingabe ist zu lang."), { status: 422 });
  return parsed;
}

function nullableDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) throw Object.assign(new Error("Datum ist ungültig."), { status: 422 });
  return parsed;
}

function nullableTimestamp(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw Object.assign(new Error("Zeitpunkt ist ungültig."), { status: 422 });
  return date;
}

async function requireCustomer(user: SessionUser, customerId: number) {
  if (!Number.isSafeInteger(customerId) || customerId < 1) throw Object.assign(new Error("Kunde ist ungültig."), { status: 422 });
  const [customer] = await db.select({
    id: customers.id,
    ownerEmployeeId: customers.ownerEmployeeId,
    customerNumber: customers.customerNumber,
  }).from(customers)
    .where(and(eq(customers.id, customerId), customerAccess(user)))
    .limit(1);
  if (!customer) throw Object.assign(new Error("Kunde nicht gefunden oder keine Berechtigung."), { status: 404 });
  return customer;
}

export async function getOptimizationHubData(user: SessionUser) {
  const access = customerAccess(user);
  const [membershipRows, goalRows, contractRows, offerRows, documentRows, customerOptions, membershipSummary, goalSummary, contractSummary, offerSummary] = await Promise.all([
    db.select({
      id: optimizationMemberships.id,
      customerId: optimizationMemberships.customerId,
      customerNumber: customers.customerNumber,
      customerName: customerNameSql(),
      status: optimizationMemberships.status,
      monthlyPriceCents: optimizationMemberships.monthlyPriceCents,
      planCode: optimizationMemberships.planCode,
      nextReviewAt: optimizationMemberships.nextReviewAt,
      nextBillingAt: optimizationMemberships.nextBillingAt,
      startedAt: optimizationMemberships.startedAt,
      billingProvider: optimizationMemberships.billingProvider,
      ownerName: employees.name,
      openGoals: sql<number>`(select count(*)::int from optimization_goals g where g.customer_id = ${customers.id} and g.status in ('open','researching','offers_ready'))`,
      activeContracts: sql<number>`(select count(*)::int from optimization_contracts c where c.customer_id = ${customers.id} and c.status in ('active','review_due','switch_planned'))`,
      proposedOffers: sql<number>`(select count(*)::int from optimization_offers o where o.customer_id = ${customers.id} and o.status = 'proposed')`,
    }).from(optimizationMemberships)
      .innerJoin(customers, eq(optimizationMemberships.customerId, customers.id))
      .leftJoin(employees, eq(optimizationMemberships.ownerEmployeeId, employees.id))
      .where(access)
      .orderBy(desc(optimizationMemberships.updatedAt))
      .limit(300),
    db.select({
      id: optimizationGoals.id,
      customerId: optimizationGoals.customerId,
      customerName: customerNameSql(),
      category: optimizationGoals.category,
      title: optimizationGoals.title,
      description: optimizationGoals.description,
      priority: optimizationGoals.priority,
      status: optimizationGoals.status,
      targetDate: optimizationGoals.targetDate,
      budgetCents: optimizationGoals.budgetCents,
      financingNeeded: optimizationGoals.financingNeeded,
      assignedName: employees.name,
      updatedAt: optimizationGoals.updatedAt,
    }).from(optimizationGoals)
      .innerJoin(customers, eq(optimizationGoals.customerId, customers.id))
      .leftJoin(employees, eq(optimizationGoals.assignedEmployeeId, employees.id))
      .where(access)
      .orderBy(desc(optimizationGoals.updatedAt))
      .limit(300),
    db.select({
      id: optimizationContracts.id,
      customerId: optimizationContracts.customerId,
      customerName: customerNameSql(),
      category: optimizationContracts.category,
      providerName: optimizationContracts.providerName,
      contractName: optimizationContracts.contractName,
      monthlyCostCents: optimizationContracts.monthlyCostCents,
      startDate: optimizationContracts.startDate,
      endDate: optimizationContracts.endDate,
      noticeDate: optimizationContracts.noticeDate,
      status: optimizationContracts.status,
      note: optimizationContracts.note,
      updatedAt: optimizationContracts.updatedAt,
    }).from(optimizationContracts)
      .innerJoin(customers, eq(optimizationContracts.customerId, customers.id))
      .where(access)
      .orderBy(desc(optimizationContracts.updatedAt))
      .limit(400),
    db.select({
      id: optimizationOffers.id,
      customerId: optimizationOffers.customerId,
      customerName: customerNameSql(),
      goalId: optimizationOffers.goalId,
      contractId: optimizationOffers.contractId,
      providerName: optimizationOffers.providerName,
      title: optimizationOffers.title,
      monthlyCostCents: optimizationOffers.monthlyCostCents,
      oneTimeCostCents: optimizationOffers.oneTimeCostCents,
      termMonths: optimizationOffers.termMonths,
      position: optimizationOffers.position,
      status: optimizationOffers.status,
      validUntil: optimizationOffers.validUntil,
      note: optimizationOffers.note,
      updatedAt: optimizationOffers.updatedAt,
    }).from(optimizationOffers)
      .innerJoin(customers, eq(optimizationOffers.customerId, customers.id))
      .where(access)
      .orderBy(desc(optimizationOffers.updatedAt))
      .limit(500),
    db.select({
      id: optimizationDocuments.id,
      customerId: optimizationDocuments.customerId,
      customerName: customerNameSql(),
      goalId: optimizationDocuments.goalId,
      contractId: optimizationDocuments.contractId,
      offerId: optimizationDocuments.offerId,
      kind: optimizationDocuments.kind,
      title: optimizationDocuments.title,
      fileName: optimizationDocuments.fileName,
      contentType: optimizationDocuments.contentType,
      byteSize: optimizationDocuments.byteSize,
      createdAt: optimizationDocuments.createdAt,
    }).from(optimizationDocuments)
      .innerJoin(customers, eq(optimizationDocuments.customerId, customers.id))
      .where(access)
      .orderBy(desc(optimizationDocuments.createdAt))
      .limit(300),
    db.select({
      id: customers.id,
      customerNumber: customers.customerNumber,
      name: customerNameSql(),
    }).from(customers)
      .where(access)
      .orderBy(desc(customers.updatedAt))
      .limit(600),
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${optimizationMemberships.status} = 'active')::int`,
      pending: sql<number>`count(*) filter (where ${optimizationMemberships.status} = 'pending')::int`,
      mrrCents: sql<number>`coalesce(sum(${optimizationMemberships.monthlyPriceCents}) filter (where ${optimizationMemberships.status} = 'active'),0)::int`,
      reviewDue: sql<number>`count(*) filter (where ${optimizationMemberships.status} = 'active' and ${optimizationMemberships.nextReviewAt} is not null and ${optimizationMemberships.nextReviewAt} <= now())::int`,
    }).from(optimizationMemberships)
      .innerJoin(customers, eq(optimizationMemberships.customerId, customers.id))
      .where(access),
    db.select({
      open: sql<number>`count(*) filter (where ${optimizationGoals.status} in ('open','researching','offers_ready'))::int`,
      financing: sql<number>`count(*) filter (where ${optimizationGoals.status} in ('open','researching','offers_ready') and ${optimizationGoals.financingNeeded} = true)::int`,
      accepted: sql<number>`count(*) filter (where ${optimizationGoals.status} = 'accepted')::int`,
    }).from(optimizationGoals)
      .innerJoin(customers, eq(optimizationGoals.customerId, customers.id))
      .where(access),
    db.select({
      active: sql<number>`count(*) filter (where ${optimizationContracts.status} in ('active','review_due','switch_planned'))::int`,
      notice30: sql<number>`count(*) filter (where ${optimizationContracts.status} in ('active','review_due','switch_planned') and ${optimizationContracts.noticeDate} is not null and ${optimizationContracts.noticeDate} <= current_date + interval '30 days')::int`,
      monthlyCents: sql<number>`coalesce(sum(${optimizationContracts.monthlyCostCents}) filter (where ${optimizationContracts.status} in ('active','review_due','switch_planned')),0)::int`,
    }).from(optimizationContracts)
      .innerJoin(customers, eq(optimizationContracts.customerId, customers.id))
      .where(access),
    db.select({
      proposed: sql<number>`count(*) filter (where ${optimizationOffers.status} = 'proposed')::int`,
      accepted: sql<number>`count(*) filter (where ${optimizationOffers.status} = 'accepted')::int`,
    }).from(optimizationOffers)
      .innerJoin(customers, eq(optimizationOffers.customerId, customers.id))
      .where(access),
  ]);

  const serializeDate = (value: Date | null) => value ? value.toISOString() : null;
  return {
    summary: {
      memberships: membershipSummary[0] ?? { total: 0, active: 0, pending: 0, mrrCents: 0, reviewDue: 0 },
      goals: goalSummary[0] ?? { open: 0, financing: 0, accepted: 0 },
      contracts: contractSummary[0] ?? { active: 0, notice30: 0, monthlyCents: 0 },
      offers: offerSummary[0] ?? { proposed: 0, accepted: 0 },
    },
    customers: customerOptions,
    memberships: membershipRows.map((row) => ({
      ...row,
      nextReviewAt: serializeDate(row.nextReviewAt),
      nextBillingAt: serializeDate(row.nextBillingAt),
      startedAt: serializeDate(row.startedAt),
    })),
    goals: goalRows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
    contracts: contractRows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
    offers: offerRows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
    documents: documentRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  };
}

export async function upsertOptimizationMembership(user: SessionUser, input: {
  customerId: number;
  status?: string;
  nextReviewAt?: string | null;
  billingProvider?: string | null;
  billingCustomerRef?: string | null;
  billingSubscriptionRef?: string | null;
}) {
  const customer = await requireCustomer(user, input.customerId);
  const status = ["pending", "active", "paused", "cancelled"].includes(input.status ?? "") ? String(input.status) : "pending";
  const nextReviewAt = nullableTimestamp(input.nextReviewAt);
  const billingProvider = text(input.billingProvider, 80) || null;
  const billingCustomerRef = text(input.billingCustomerRef, 180) || null;
  const billingSubscriptionRef = text(input.billingSubscriptionRef, 180) || null;

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(optimizationMemberships)
      .where(eq(optimizationMemberships.customerId, customer.id))
      .limit(1)
      .for("update");
    const now = new Date();
    if (existing) {
      const [updated] = await tx.update(optimizationMemberships).set({
        status,
        monthlyPriceCents: OPTIMIZATION_MEMBERSHIP_PRICE_CENTS,
        planCode: OPTIMIZATION_PLAN_CODE,
        ownerEmployeeId: existing.ownerEmployeeId ?? user.id,
        billingProvider,
        billingCustomerRef,
        billingSubscriptionRef,
        nextReviewAt,
        startedAt: status === "active" ? existing.startedAt ?? now : existing.startedAt,
        cancelledAt: status === "cancelled" ? now : null,
        updatedAt: now,
      }).where(eq(optimizationMemberships.id, existing.id)).returning();
      await writeAudit(tx, user.id, "optimization.membership.updated", "optimization_membership", existing.id, {
        status: existing.status,
        nextReviewAt: existing.nextReviewAt?.toISOString() ?? null,
      }, {
        status,
        nextReviewAt: nextReviewAt?.toISOString() ?? null,
      });
      await emitEvent(tx, "optimization.membership.updated", "optimization_membership", existing.id, { customerId: customer.id, status });
      return updated;
    }

    const [created] = await tx.insert(optimizationMemberships).values({
      customerId: customer.id,
      planCode: OPTIMIZATION_PLAN_CODE,
      monthlyPriceCents: OPTIMIZATION_MEMBERSHIP_PRICE_CENTS,
      status,
      ownerEmployeeId: user.id,
      billingProvider,
      billingCustomerRef,
      billingSubscriptionRef,
      nextReviewAt,
      startedAt: status === "active" ? now : null,
      cancelledAt: status === "cancelled" ? now : null,
    }).returning();
    await writeAudit(tx, user.id, "optimization.membership.created", "optimization_membership", created.id, undefined, {
      customerId: customer.id,
      status,
      priceCents: OPTIMIZATION_MEMBERSHIP_PRICE_CENTS,
    });
    await emitEvent(tx, "optimization.membership.created", "optimization_membership", created.id, { customerId: customer.id, status });
    return created;
  });
}

export async function createOptimizationGoal(user: SessionUser, input: {
  customerId: number;
  category: string;
  title: string;
  description?: string;
  priority?: string;
  targetDate?: string | null;
  budgetCents?: number | null;
  financingNeeded?: boolean;
}) {
  const customer = await requireCustomer(user, input.customerId);
  const [membership] = await db.select({ id: optimizationMemberships.id }).from(optimizationMemberships)
    .where(eq(optimizationMemberships.customerId, customer.id)).limit(1);
  const category = OPTIMIZATION_CATEGORIES.includes(input.category as (typeof OPTIMIZATION_CATEGORIES)[number]) ? input.category : "sonstiges";
  const priority = ["low", "normal", "high", "critical"].includes(input.priority ?? "") ? String(input.priority) : "normal";
  const [created] = await db.insert(optimizationGoals).values({
    customerId: customer.id,
    membershipId: membership?.id ?? null,
    category,
    title: text(input.title, 180, true),
    description: text(input.description, 3000),
    priority,
    targetDate: nullableDate(input.targetDate),
    budgetCents: cents(input.budgetCents),
    financingNeeded: Boolean(input.financingNeeded),
    assignedEmployeeId: user.id,
    createdByEmployeeId: user.id,
  }).returning();
  await db.transaction(async (tx) => {
    await writeAudit(tx, user.id, "optimization.goal.created", "optimization_goal", created.id, undefined, {
      customerId: customer.id, category, priority,
    });
    await emitEvent(tx, "optimization.goal.created", "optimization_goal", created.id, {
      customerId: customer.id, category, assignedEmployeeId: user.id,
    });
  });
  return created;
}

export async function createOptimizationContract(user: SessionUser, input: {
  customerId: number;
  category: string;
  providerName: string;
  contractName: string;
  monthlyCostCents?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  noticeDate?: string | null;
  status?: string;
  note?: string;
}) {
  const customer = await requireCustomer(user, input.customerId);
  const [membership] = await db.select({ id: optimizationMemberships.id }).from(optimizationMemberships)
    .where(eq(optimizationMemberships.customerId, customer.id)).limit(1);
  const category = OPTIMIZATION_CATEGORIES.includes(input.category as (typeof OPTIMIZATION_CATEGORIES)[number]) ? input.category : "sonstiges";
  const status = ["active", "review_due", "switch_planned", "cancelled", "expired"].includes(input.status ?? "") ? String(input.status) : "active";
  const [created] = await db.insert(optimizationContracts).values({
    customerId: customer.id,
    membershipId: membership?.id ?? null,
    category,
    providerName: text(input.providerName, 180, true),
    contractName: text(input.contractName, 220, true),
    monthlyCostCents: cents(input.monthlyCostCents),
    startDate: nullableDate(input.startDate),
    endDate: nullableDate(input.endDate),
    noticeDate: nullableDate(input.noticeDate),
    status,
    note: text(input.note, 3000),
    createdByEmployeeId: user.id,
  }).returning();
  await db.transaction(async (tx) => {
    await writeAudit(tx, user.id, "optimization.contract.created", "optimization_contract", created.id, undefined, {
      customerId: customer.id, category, status,
    });
    await emitEvent(tx, "optimization.contract.created", "optimization_contract", created.id, { customerId: customer.id, category });
  });
  return created;
}

export async function createOptimizationOffer(user: SessionUser, input: {
  customerId: number;
  goalId?: number | null;
  contractId?: number | null;
  providerName: string;
  title: string;
  monthlyCostCents?: number | null;
  oneTimeCostCents?: number | null;
  termMonths?: number | null;
  position?: number;
  status?: string;
  validUntil?: string | null;
  note?: string;
}) {
  const customer = await requireCustomer(user, input.customerId);
  const goalId = Number.isSafeInteger(input.goalId) && Number(input.goalId) > 0 ? Number(input.goalId) : null;
  const contractId = Number.isSafeInteger(input.contractId) && Number(input.contractId) > 0 ? Number(input.contractId) : null;
  if (goalId) {
    const [goal] = await db.select({ id: optimizationGoals.id }).from(optimizationGoals)
      .where(and(eq(optimizationGoals.id, goalId), eq(optimizationGoals.customerId, customer.id))).limit(1);
    if (!goal) throw Object.assign(new Error("Wunsch passt nicht zum Kunden."), { status: 422 });
  }
  if (contractId) {
    const [contract] = await db.select({ id: optimizationContracts.id }).from(optimizationContracts)
      .where(and(eq(optimizationContracts.id, contractId), eq(optimizationContracts.customerId, customer.id))).limit(1);
    if (!contract) throw Object.assign(new Error("Vertrag passt nicht zum Kunden."), { status: 422 });
  }
  const position = Math.max(1, Math.min(10, Math.trunc(Number(input.position) || 1)));
  const status = ["draft", "proposed", "accepted", "rejected", "expired"].includes(input.status ?? "") ? String(input.status) : "proposed";
  const termMonths = input.termMonths === null || input.termMonths === undefined
    ? null
    : Math.max(0, Math.min(600, Math.trunc(Number(input.termMonths))));
  const [created] = await db.insert(optimizationOffers).values({
    customerId: customer.id,
    goalId,
    contractId,
    providerName: text(input.providerName, 180, true),
    title: text(input.title, 220, true),
    monthlyCostCents: cents(input.monthlyCostCents),
    oneTimeCostCents: cents(input.oneTimeCostCents),
    termMonths,
    position,
    status,
    validUntil: nullableDate(input.validUntil),
    note: text(input.note, 3000),
    createdByEmployeeId: user.id,
  }).returning();
  await db.transaction(async (tx) => {
    await writeAudit(tx, user.id, "optimization.offer.created", "optimization_offer", created.id, undefined, {
      customerId: customer.id, goalId, contractId, position, status,
    });
    await emitEvent(tx, "optimization.offer.created", "optimization_offer", created.id, { customerId: customer.id, goalId, status });
  });
  return created;
}

export async function updateOptimizationOfferStatus(user: SessionUser, offerId: number, status: string) {
  if (!Number.isSafeInteger(offerId) || offerId < 1) throw Object.assign(new Error("Angebot ist ungültig."), { status: 422 });
  if (!["draft", "proposed", "accepted", "rejected", "expired"].includes(status)) throw Object.assign(new Error("Angebotsstatus ist ungültig."), { status: 422 });

  return db.transaction(async (tx) => {
    const [current] = await tx.select({
      id: optimizationOffers.id,
      customerId: optimizationOffers.customerId,
      goalId: optimizationOffers.goalId,
      status: optimizationOffers.status,
    }).from(optimizationOffers)
      .innerJoin(customers, eq(optimizationOffers.customerId, customers.id))
      .where(and(eq(optimizationOffers.id, offerId), customerAccess(user)))
      .limit(1)
      .for("update");
    if (!current) throw Object.assign(new Error("Angebot nicht gefunden oder keine Berechtigung."), { status: 404 });

    const [updated] = await tx.update(optimizationOffers).set({ status, updatedAt: new Date() })
      .where(eq(optimizationOffers.id, offerId)).returning();
    if (status === "accepted" && current.goalId) {
      await tx.update(optimizationGoals).set({ status: "accepted", updatedAt: new Date() })
        .where(eq(optimizationGoals.id, current.goalId));
    }
    await writeAudit(tx, user.id, "optimization.offer.status", "optimization_offer", offerId, { status: current.status }, { status });
    await emitEvent(tx, "optimization.offer.status", "optimization_offer", offerId, { customerId: current.customerId, goalId: current.goalId, status });
    return updated;
  });
}

const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export async function storeOptimizationDocument(user: SessionUser, input: {
  customerId: number;
  title: string;
  kind?: string;
  goalId?: number | null;
  contractId?: number | null;
  offerId?: number | null;
  fileName: string;
  contentType: string;
  data: Buffer;
}) {
  const customer = await requireCustomer(user, input.customerId);
  if (!input.data.length || input.data.length > MAX_DOCUMENT_BYTES) throw Object.assign(new Error("Datei muss zwischen 1 Byte und 8 MB groß sein."), { status: 422 });
  if (!ALLOWED_DOCUMENT_TYPES.has(input.contentType)) throw Object.assign(new Error("Erlaubt sind PDF, JPG, PNG oder WebP."), { status: 422 });
  const title = text(input.title, 220, true);
  const fileName = text(input.fileName, 240, true);
  const kind = ["contract", "offer", "invoice", "proof", "other"].includes(input.kind ?? "") ? String(input.kind) : "contract";
  const digest = createHash("sha256").update(input.data).digest("hex");

  const ids = {
    goalId: Number.isSafeInteger(input.goalId) && Number(input.goalId) > 0 ? Number(input.goalId) : null,
    contractId: Number.isSafeInteger(input.contractId) && Number(input.contractId) > 0 ? Number(input.contractId) : null,
    offerId: Number.isSafeInteger(input.offerId) && Number(input.offerId) > 0 ? Number(input.offerId) : null,
  };

  if (ids.goalId) {
    const [row] = await db.select({ id: optimizationGoals.id }).from(optimizationGoals).where(and(eq(optimizationGoals.id, ids.goalId), eq(optimizationGoals.customerId, customer.id))).limit(1);
    if (!row) throw Object.assign(new Error("Wunsch passt nicht zum Kunden."), { status: 422 });
  }
  if (ids.contractId) {
    const [row] = await db.select({ id: optimizationContracts.id }).from(optimizationContracts).where(and(eq(optimizationContracts.id, ids.contractId), eq(optimizationContracts.customerId, customer.id))).limit(1);
    if (!row) throw Object.assign(new Error("Vertrag passt nicht zum Kunden."), { status: 422 });
  }
  if (ids.offerId) {
    const [row] = await db.select({ id: optimizationOffers.id }).from(optimizationOffers).where(and(eq(optimizationOffers.id, ids.offerId), eq(optimizationOffers.customerId, customer.id))).limit(1);
    if (!row) throw Object.assign(new Error("Angebot passt nicht zum Kunden."), { status: 422 });
  }

  const [created] = await db.insert(optimizationDocuments).values({
    customerId: customer.id,
    ...ids,
    kind,
    title,
    fileName,
    contentType: input.contentType,
    byteSize: input.data.length,
    digest,
    data: input.data,
    uploadedByEmployeeId: user.id,
  }).returning({ id: optimizationDocuments.id });
  return created;
}

export async function getOptimizationDocument(user: SessionUser, id: number) {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const [row] = await db.select({
    id: optimizationDocuments.id,
    title: optimizationDocuments.title,
    fileName: optimizationDocuments.fileName,
    contentType: optimizationDocuments.contentType,
    byteSize: optimizationDocuments.byteSize,
    digest: optimizationDocuments.digest,
    data: optimizationDocuments.data,
  }).from(optimizationDocuments)
    .innerJoin(customers, eq(optimizationDocuments.customerId, customers.id))
    .where(and(eq(optimizationDocuments.id, id), customerAccess(user)))
    .limit(1);
  return row ?? null;
}

export async function listOptimizationAssignees() {
  return db.select({ id: employees.id, name: employees.name }).from(employees)
    .where(eq(employees.active, true)).orderBy(employees.name);
}
