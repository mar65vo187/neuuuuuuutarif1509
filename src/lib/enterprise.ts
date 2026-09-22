import { randomBytes } from "node:crypto";
import { and, desc, eq, getTableColumns, gte, ilike, inArray, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { employees, leadNotes, leads } from "@/db/schema";
import {
  auditEvents,
  automationRules,
  automationRuns,
  benefitPoolLedger,
  commissionEvents,
  trainingModules,
  productCatalogProfiles,
  employeeTrainingCompletions,
  customerActivities,
  customerCrmProfiles,
  customerLeadLinks,
  customerOpportunities,
  customerReferrals,
  customers,
  leadCallActivities,
  notificationQueue,
  orderStatusHistory,
  orders,
  outboxEvents,
  products,
  providers,
  reconciliationIssues,
  serviceCaseEvents,
  serviceCases,
  tasks,
  type Customer,
} from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";
import { isCompensationOwner } from "@/lib/compensation";
import { syncReferralRewardForOrder } from "@/lib/referral-reward-engine";
import { leadAccessCondition } from "@/lib/queries";
import { getCustomerIntelligence } from "@/lib/customer-intelligence";
import { percentage } from "@/lib/bi-metrics";
import { contactDuplicateError, lockAndFindStrongContactDuplicate } from "@/lib/contact-identity";
import { leadAssignableEmployeeCondition, permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { getOperationsPolicy } from "@/lib/operations-policy";
import { operationsPolicyCutoffs } from "@/lib/operations-policy-shared";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function suffix() {
  return randomBytes(4).toString("hex").toUpperCase();
}

function customerNumber() {
  return `TWK-${new Date().getFullYear()}-${suffix()}`;
}

function orderNumber() {
  return `TWO-${new Date().getFullYear()}-${suffix()}`;
}

export function customerAccess(user: SessionUser) {
  return user.role === "admin" ? sql`true` : eq(customers.ownerEmployeeId, user.id);
}

function orderAccess(user: SessionUser) {
  return user.role === "admin" ? sql`true` : eq(orders.advisorEmployeeId, user.id);
}

function taskAccess(user: SessionUser) {
  return user.role === "admin" ? sql`true` : eq(tasks.assignedToEmployeeId, user.id);
}

export async function writeAudit(
  tx: Tx,
  actorEmployeeId: number | null,
  action: string,
  entityType: string,
  entityId: string | number | null,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
) {
  await tx.insert(auditEvents).values({
    actorEmployeeId,
    action,
    entityType,
    entityId: entityId === null ? null : String(entityId),
    oldValues,
    newValues,
  });
}

export async function emitEvent(
  tx: Tx,
  eventType: string,
  entityType: string,
  entityId: string | number | null,
  payload: Record<string, unknown> = {},
) {
  await tx.insert(outboxEvents).values({
    eventType,
    entityType,
    entityId: entityId === null ? null : String(entityId),
    payload,
  });
}

function matchesConditions(conditions: Record<string, unknown>, payload: Record<string, unknown>) {
  return Object.entries(conditions).every(([key, expected]) => payload[key] === expected);
}

export async function runAutomationEvent(
  tx: Tx,
  eventType: string,
  entityType: string,
  entityId: number,
  payload: Record<string, unknown>,
  actorEmployeeId?: number | null,
) {
  const rules = await tx.select().from(automationRules)
    .where(and(eq(automationRules.active, true), eq(automationRules.eventType, eventType)));
  for (const rule of rules) {
    if (!matchesConditions(rule.conditions ?? {}, payload)) continue;
    const [run] = await tx.insert(automationRuns).values({
      ruleId: rule.id,
      eventType,
      entityType,
      entityId: String(entityId),
      status: "running",
      detail: { payload },
    }).returning({ id: automationRuns.id });
    try {
      for (const action of rule.actions ?? []) {
        if (action.type === "task" && typeof action.title === "string") {
          const minutes = typeof action.dueMinutes === "number" ? Math.max(0, action.dueMinutes) : 60;
          await tx.insert(tasks).values({
            entityType,
            entityId,
            assignedToEmployeeId: typeof payload.assignedEmployeeId === "number" ? payload.assignedEmployeeId : actorEmployeeId ?? null,
            createdByEmployeeId: actorEmployeeId ?? null,
            type: typeof action.taskType === "string" ? action.taskType : "follow_up",
            title: action.title,
            description: typeof action.description === "string" ? action.description : null,
            priority: typeof action.priority === "string" ? action.priority : "normal",
            dueAt: new Date(Date.now() + minutes * 60_000),
          });
        }
        if (action.type === "notification" && typeof action.body === "string") {
          const employeeId = typeof payload.assignedEmployeeId === "number" ? payload.assignedEmployeeId : actorEmployeeId ?? null;
          const actionUrl = entityType === "lead"
            ? `/portal/leads/${entityId}`
            : entityType === "customer"
              ? `/portal/kunden/${entityId}`
              : entityType === "order"
                ? `/portal/auftraege/${entityId}`
                : null;
          const priority = action.priority === "critical" || action.priority === "high" ? action.priority : "normal";
          await tx.insert(notificationQueue).values({
            employeeId,
            channel: "in_app",
            category: "automation",
            priority,
            subject: typeof action.subject === "string" ? action.subject : null,
            body: action.body,
            entityType,
            entityId: String(entityId),
            actionUrl,
            metadata: { eventType, ruleId: rule.id },
          });
        }
      }
      await tx.update(automationRuns).set({ status: "success", finishedAt: new Date() }).where(eq(automationRuns.id, run.id));
    } catch (error) {
      await tx.update(automationRuns).set({
        status: "failed",
        finishedAt: new Date(),
        detail: { payload, error: error instanceof Error ? error.message : "automation_failed" },
      }).where(eq(automationRuns.id, run.id));
    }
  }
}

export async function routeNewLead(tx: Tx, leadId: number, advisorId: number | null) {
  let selectedEmployeeId: number | null = null;

  if (advisorId) {
    const [preferred] = await tx.select({ id: employees.id }).from(employees)
      .where(and(eq(employees.active, true), eq(employees.advisorId, advisorId), leadAssignableEmployeeCondition()))
      .limit(1);
    selectedEmployeeId = preferred?.id ?? null;
  }

  if (!selectedEmployeeId) {
    const candidates = await tx.select({
      id: employees.id,
      openCount: sql<number>`count(${leads.id})::int`,
    }).from(employees)
      .leftJoin(leads, and(
        eq(leads.assignedEmployeeId, employees.id),
        inArray(leads.status, ["neu", "kontaktiert", "termin_bestaetigt", "in_beratung"]),
      ))
      .where(and(eq(employees.active, true), eq(employees.role, "berater"), leadAssignableEmployeeCondition()))
      .groupBy(employees.id)
      .orderBy(sql`count(${leads.id}) asc`, employees.id)
      .limit(1);
    selectedEmployeeId = candidates[0]?.id ?? null;
  }

  if (selectedEmployeeId) {
    await tx.update(leads).set({ assignedEmployeeId: selectedEmployeeId, updatedAt: new Date() }).where(eq(leads.id, leadId));
  }

  await emitEvent(tx, "lead.created", "lead", leadId, { assignedEmployeeId: selectedEmployeeId });
  await runAutomationEvent(tx, "lead.created", "lead", leadId, { assignedEmployeeId: selectedEmployeeId }, selectedEmployeeId);
  return selectedEmployeeId;
}

export async function ensureCustomerForLead(leadId: number, user: SessionUser): Promise<Customer> {
  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads)
      .where(and(eq(leads.id, leadId), leadAccessCondition(user)))
      .limit(1)
      .for("update");
    if (!lead) throw new Error("Lead nicht gefunden oder keine Berechtigung.");

    const [linked] = await tx
      .select({ customer: customers })
      .from(customerLeadLinks)
      .innerJoin(customers, eq(customerLeadLinks.customerId, customers.id))
      .where(eq(customerLeadLinks.leadId, leadId))
      .limit(1);
    if (linked?.customer) return linked.customer;

    const normalizedName = lead.name.trim();
    const parts = normalizedName ? normalizedName.split(/\s+/) : [];
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] || null;
    const lastName = parts.length > 1 ? parts.at(-1) ?? null : null;
    const leadMeta = (lead.meta ?? {}) as Record<string, unknown>;
    const businessLead = leadMeta.audience === "b2b";
    const companyName = businessLead && typeof leadMeta.companyName === "string" && leadMeta.companyName.trim()
      ? leadMeta.companyName.trim()
      : null;
    const [created] = await tx.insert(customers).values({
      customerNumber: customerNumber(),
      type: businessLead ? "business" : "private",
      firstName,
      lastName,
      companyName,
      email: lead.email || null,
      phone: lead.phone || null,
      city: lead.region,
      preferredChannel: lead.preferredChannel,
      ownerEmployeeId: lead.assignedEmployeeId ?? lead.createdByEmployeeId ?? user.id,
      createdFromLeadId: lead.id,
      metadata: {
        source: lead.source ?? "website",
        topic: lead.topic,
        audience: businessLead ? "b2b" : "b2c",
        ...(typeof leadMeta.landingPath === "string" && leadMeta.landingPath ? { landingPath: leadMeta.landingPath } : {}),
        ...(typeof leadMeta.utmSource === "string" && leadMeta.utmSource ? { utmSource: leadMeta.utmSource } : {}),
        ...(typeof leadMeta.utmCampaign === "string" && leadMeta.utmCampaign ? { utmCampaign: leadMeta.utmCampaign } : {}),
      },
    }).returning();
    await tx.insert(customerLeadLinks).values({ customerId: created.id, leadId: lead.id });
    await tx.update(customerReferrals)
      .set({ referredCustomerId: created.id })
      .where(eq(customerReferrals.referredLeadId, lead.id));
    await writeAudit(tx, user.id, "customer.created_from_lead", "customer", created.id, undefined, {
      customerNumber: created.customerNumber,
      leadId: lead.id,
    });
    await emitEvent(tx, "customer.created", "customer", created.id, { leadId: lead.id, assignedEmployeeId: created.ownerEmployeeId });
    return created;
  });
}

export async function createCustomer(input: {
  type?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
  preferredChannel?: string;
  referredByCustomerId?: number;
  referralRelationship?: string;
  referralNote?: string;
}, user: SessionUser) {
  return db.transaction(async (tx) => {
    const duplicate = await lockAndFindStrongContactDuplicate(tx, { email: input.email, phone: input.phone }, user);
    if (duplicate) throw contactDuplicateError(duplicate);

    const [created] = await tx.insert(customers).values({
      customerNumber: customerNumber(),
      type: input.type === "business" ? "business" : "private",
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      companyName: input.companyName?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      city: input.city?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      preferredChannel: input.preferredChannel?.trim() || null,
      ownerEmployeeId: user.id,
    }).returning();
    if (input.referredByCustomerId) {
      const [source] = await tx.select({ id: customers.id }).from(customers).where(and(
        eq(customers.id, input.referredByCustomerId),
        customerAccess(user),
        isNull(customers.archivedAt),
      )).limit(1);
      if (!source) throw new Error("Empfehlender Kunde wurde nicht gefunden oder ist nicht sichtbar.");
      if (source.id === created.id) throw new Error("Ein Kunde kann sich nicht selbst empfehlen.");
      await tx.insert(customerReferrals).values({
        sourceCustomerId: source.id,
        referredCustomerId: created.id,
        relationship: input.referralRelationship?.trim() || "",
        note: input.referralNote?.trim() || "",
        createdByEmployeeId: user.id,
      }).onConflictDoNothing();
    }
    await writeAudit(tx, user.id, "customer.created", "customer", created.id, undefined, {
      customerNumber: created.customerNumber,
      referredByCustomerId: input.referredByCustomerId ?? null,
    });
    await emitEvent(tx, "customer.created", "customer", created.id, { assignedEmployeeId: user.id, referredByCustomerId: input.referredByCustomerId ?? null });
    return created;
  });
}

export async function updateCustomer(id: number, input: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  postalCode?: string | null;
  preferredChannel?: string | null;
}, user: SessionUser) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(customers)
      .where(and(eq(customers.id, id), customerAccess(user), isNull(customers.archivedAt)))
      .limit(1)
      .for("update");
    if (!existing) throw new Error("Kunde nicht gefunden.");

    const patch: Partial<typeof customers.$inferInsert> = { updatedAt: new Date() };
    const normalize = (value: string | null | undefined) => value === undefined ? undefined : value?.trim() || null;

    if (input.firstName !== undefined) patch.firstName = normalize(input.firstName);
    if (input.lastName !== undefined) patch.lastName = normalize(input.lastName);
    if (input.companyName !== undefined) patch.companyName = normalize(input.companyName);
    if (input.email !== undefined) patch.email = normalize(input.email)?.toLowerCase() ?? null;
    if (input.phone !== undefined) patch.phone = normalize(input.phone);
    if (input.city !== undefined) patch.city = normalize(input.city);
    if (input.postalCode !== undefined) patch.postalCode = normalize(input.postalCode);
    if (input.preferredChannel !== undefined) patch.preferredChannel = normalize(input.preferredChannel);

    const [updated] = await tx.update(customers).set(patch).where(eq(customers.id, id)).returning();
    await writeAudit(tx, user.id, "customer.updated", "customer", id, {
      firstName: existing.firstName,
      lastName: existing.lastName,
      companyName: existing.companyName,
      email: existing.email,
      phone: existing.phone,
      city: existing.city,
      postalCode: existing.postalCode,
      preferredChannel: existing.preferredChannel,
    }, {
      firstName: updated.firstName,
      lastName: updated.lastName,
      companyName: updated.companyName,
      email: updated.email,
      phone: updated.phone,
      city: updated.city,
      postalCode: updated.postalCode,
      preferredChannel: updated.preferredChannel,
    });
    return updated;
  });
}

export async function createCustomerReferral(input: {
  sourceCustomerId: number;
  name?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  topics?: string[];
  note?: string;
}, user: SessionUser) {
  return db.transaction(async (tx) => {
    const [source] = await tx.select().from(customers).where(and(
      eq(customers.id, input.sourceCustomerId),
      customerAccess(user),
      isNull(customers.archivedAt),
    )).limit(1).for("update");
    if (!source) throw new Error("Kunde nicht gefunden.");

    const name = input.name?.trim() || "";
    const email = input.email?.trim().toLowerCase() || "";
    const phone = input.phone?.trim() || null;
    const topics = [...new Set((input.topics ?? []).map((topic) => topic.trim()).filter(Boolean))].slice(0, 12);
    const note = input.note?.trim() || "";
    const sourceName = source.companyName || [source.firstName, source.lastName].filter(Boolean).join(" ") || source.customerNumber;

    const strongDuplicate = await lockAndFindStrongContactDuplicate(tx, { email, phone }, user);
    if (strongDuplicate) throw contactDuplicateError(strongDuplicate);

    if (email || phone) {
      const duplicateConditions: SQL[] = [];
      if (email) duplicateConditions.push(sql`lower(${leads.email}) = ${email}`);
      if (phone) duplicateConditions.push(eq(leads.phone, phone));
      const [duplicate] = await tx.select({ id: customerReferrals.id })
        .from(customerReferrals)
        .innerJoin(leads, eq(customerReferrals.referredLeadId, leads.id))
        .where(and(
          eq(customerReferrals.sourceCustomerId, source.id),
          or(...duplicateConditions)!,
        ))
        .limit(1);
      if (duplicate) throw new Error("Diese Person wurde von diesem Kunden bereits als Empfehlung erfasst.");
    }

    const [lead] = await tx.insert(leads).values({
      type: "beratung",
      status: "neu",
      name,
      email,
      phone,
      topic: topics.join(" · ") || null,
      message: note || null,
      assignedEmployeeId: user.id,
      createdByEmployeeId: user.id,
      source: `kundenempfehlung:${source.id}`,
      meta: {
        referralSourceCustomerId: source.id,
        referralSourceCustomerNumber: source.customerNumber,
        referralSourceName: sourceName,
        referralRelationship: input.relationship?.trim() || "",
      },
      priority: "normal",
      contactOutcome: "open",
    }).returning();

    await tx.insert(customerReferrals).values({
      sourceCustomerId: source.id,
      referredLeadId: lead.id,
      relationship: input.relationship?.trim() || "",
      note,
      createdByEmployeeId: user.id,
    });

    await writeAudit(tx, user.id, "customer.referral.created", "lead", lead.id, undefined, {
      sourceCustomerId: source.id,
      sourceCustomerNumber: source.customerNumber,
      relationship: input.relationship?.trim() || "",
      topics,
    });
    await emitEvent(tx, "lead.created", "lead", lead.id, { assignedEmployeeId: user.id, referralSourceCustomerId: source.id });
    await runAutomationEvent(tx, "lead.created", "lead", lead.id, { assignedEmployeeId: user.id, referralSourceCustomerId: source.id }, user.id);

    return lead;
  });
}

export async function listCustomers(
  user: SessionUser,
  search?: string,
  limit = 100,
  filter?: { focus?: "review" | "opportunity" | "risk"; page?: number; lookahead?: boolean },
) {
  const conditions = [customerAccess(user), isNull(customers.archivedAt)];
  const q = search?.trim();
  if (q) {
    conditions.push(or(
      ilike(customers.customerNumber, `%${q}%`),
      ilike(customers.firstName, `%${q}%`),
      ilike(customers.lastName, `%${q}%`),
      ilike(customers.companyName, `%${q}%`),
      ilike(customers.email, `%${q}%`),
      ilike(customers.phone, `%${q}%`),
    )!);
  }
  if (filter?.focus === "review") conditions.push(sql`exists (
    select 1 from customer_crm_profiles ccp
    where ccp.customer_id = ${customers.id}
      and ccp.next_review_at is not null
      and ccp.next_review_at < now()
  )`);
  if (filter?.focus === "opportunity") conditions.push(sql`exists (
    select 1 from customer_opportunities co
    where co.customer_id = ${customers.id}
      and co.status in ('open','qualified','later')
  )`);
  if (filter?.focus === "risk") conditions.push(sql`exists (
    select 1 from customer_crm_profiles ccp
    where ccp.customer_id = ${customers.id}
      and (ccp.relationship_status = 'at_risk' or ccp.risk_level in ('high','critical'))
  )`);
  const page = Number.isSafeInteger(filter?.page) && Number(filter?.page) > 0 ? Number(filter?.page) : 1;
  const pageSize = Math.max(1, Math.min(limit, 200));
  const queryLimit = pageSize + (filter?.lookahead ? 1 : 0);
  const offset = (page - 1) * pageSize;

  return db.select({
    ...getTableColumns(customers),
    referralCount: sql<number>`(select count(*)::int from customer_referrals cr where cr.source_customer_id = ${customers.id})`,
    referredByCustomerId: sql<number | null>`(select cr.source_customer_id from customer_referrals cr where cr.referred_customer_id = ${customers.id} limit 1)`,
    referredByName: sql<string | null>`(
      select coalesce(source.company_name, nullif(trim(concat_ws(' ', source.first_name, source.last_name)), ''), source.customer_number)
      from customer_referrals cr
      join customers source on source.id = cr.source_customer_id
      where cr.referred_customer_id = ${customers.id}
      limit 1
    )`,
    activeOrderCount: sql<number>`(
      select count(*)::int from orders o
      where o.customer_id = ${customers.id} and o.status in ('accepted','activation_pending','active')
    )`,
    openOpportunityCount: sql<number>`(
      select count(*)::int from customer_opportunities co
      where co.customer_id = ${customers.id} and co.status in ('open','qualified','later')
    )`,
    nextReviewAt: sql<Date | null>`(
      select ccp.next_review_at from customer_crm_profiles ccp where ccp.customer_id = ${customers.id}
    )`,
    reviewOverdue: sql<boolean>`exists (
      select 1 from customer_crm_profiles ccp
      where ccp.customer_id = ${customers.id}
        and ccp.next_review_at is not null
        and ccp.next_review_at < now()
    )`,
    lastContactAt: sql<Date | null>`(
      select ccp.last_contact_at from customer_crm_profiles ccp where ccp.customer_id = ${customers.id}
    )`,
    relationshipStatus: sql<string | null>`(
      select ccp.relationship_status from customer_crm_profiles ccp where ccp.customer_id = ${customers.id}
    )`,
    crmRiskLevel: sql<string | null>`(
      select ccp.risk_level from customer_crm_profiles ccp where ccp.customer_id = ${customers.id}
    )`,
  }).from(customers).where(and(...conditions)).orderBy(desc(customers.updatedAt), desc(customers.id)).limit(queryLimit).offset(offset);
}

export async function getCustomer(id: number, user: SessionUser) {
  const [customer] = await db.select().from(customers).where(and(eq(customers.id, id), customerAccess(user))).limit(1);
  if (!customer) return null;
  const [customerOrders, customerTasks, referralSource, referrals] = await Promise.all([
    db.select({
      order: orders,
      providerName: providers.name,
      productName: products.name,
      productCategory: products.category,
    }).from(orders)
      .leftJoin(providers, eq(orders.providerId, providers.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .where(and(eq(orders.customerId, id), orderAccess(user)))
      .orderBy(desc(orders.createdAt)),
    db.select().from(tasks)
      .where(and(eq(tasks.entityType, "customer"), eq(tasks.entityId, id), taskAccess(user)))
      .orderBy(desc(tasks.createdAt)),
    db.select({
      sourceCustomerId: customerReferrals.sourceCustomerId,
      sourceCustomerNumber: sql<string>`source.customer_number`,
      sourceName: sql<string>`coalesce(source.company_name, nullif(trim(concat_ws(' ', source.first_name, source.last_name)), ''), source.customer_number)`,
      relationship: customerReferrals.relationship,
      note: customerReferrals.note,
      createdAt: customerReferrals.createdAt,
    }).from(customerReferrals)
      .innerJoin(sql`customers source`, sql`source.id = ${customerReferrals.sourceCustomerId}`)
      .where(eq(customerReferrals.referredCustomerId, id))
      .limit(1),
    db.select({
      id: customerReferrals.id,
      referredLeadId: customerReferrals.referredLeadId,
      referredCustomerId: customerReferrals.referredCustomerId,
      relationship: customerReferrals.relationship,
      note: customerReferrals.note,
      createdAt: customerReferrals.createdAt,
      leadName: leads.name,
      leadEmail: leads.email,
      leadPhone: leads.phone,
      leadStatus: leads.status,
      leadTopic: leads.topic,
      targetCustomerNumber: sql<string | null>`(select c.customer_number from customers c where c.id = ${customerReferrals.referredCustomerId})`,
      targetCustomerName: sql<string | null>`(select coalesce(c.company_name, nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''), c.customer_number) from customers c where c.id = ${customerReferrals.referredCustomerId})`,
    }).from(customerReferrals)
      .leftJoin(leads, eq(customerReferrals.referredLeadId, leads.id))
      .where(eq(customerReferrals.sourceCustomerId, id))
      .orderBy(desc(customerReferrals.createdAt)),
  ]);
  return {
    customer,
    orders: customerOrders,
    tasks: customerTasks,
    referralSource: referralSource[0] ?? null,
    referrals,
  };
}

export async function getCustomer360(id: number, user: SessionUser) {
  const base = await getCustomer(id, user);
  if (!base) return null;
  const serviceCapabilities = await permissionSnapshot(user, [
    PORTAL_PERMISSION.SERVICE_READ,
    PORTAL_PERMISSION.SERVICE_EDIT,
    PORTAL_PERMISSION.SERVICE_ASSIGN,
  ] as const);
  const canServiceAssign = serviceCapabilities[PORTAL_PERMISSION.SERVICE_ASSIGN] || user.role === "admin";
  const canService = serviceCapabilities[PORTAL_PERMISSION.SERVICE_READ]
    || serviceCapabilities[PORTAL_PERMISSION.SERVICE_EDIT]
    || canServiceAssign;
  const serviceAccess = eq(serviceCases.customerId, id);

  const [
    profileRows,
    activities,
    opportunities,
    linkedLeads,
    linkedLeadNotes,
    linkedLeadCalls,
    customerOrderHistory,
    customerServiceCases,
    customerServiceEvents,
    categoryRows,
  ] = await Promise.all([
    db.select().from(customerCrmProfiles).where(eq(customerCrmProfiles.customerId, id)).limit(1),
    db.select({
      activity: customerActivities,
      employeeName: employees.name,
    }).from(customerActivities)
      .leftJoin(employees, eq(customerActivities.employeeId, employees.id))
      .where(eq(customerActivities.customerId, id))
      .orderBy(desc(customerActivities.occurredAt))
      .limit(120),
    db.select({
      opportunity: customerOpportunities,
      productName: products.name,
      productCategory: products.category,
      providerName: providers.name,
    }).from(customerOpportunities)
      .leftJoin(products, eq(customerOpportunities.productId, products.id))
      .leftJoin(providers, eq(products.providerId, providers.id))
      .where(eq(customerOpportunities.customerId, id))
      .orderBy(desc(customerOpportunities.updatedAt))
      .limit(100),
    db.select({
      id: leads.id,
      name: leads.name,
      topic: leads.topic,
      status: leads.status,
      priority: leads.priority,
      source: leads.source,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    }).from(customerLeadLinks)
      .innerJoin(leads, eq(customerLeadLinks.leadId, leads.id))
      .where(eq(customerLeadLinks.customerId, id))
      .orderBy(desc(leads.createdAt))
      .limit(80),
    db.select({
      id: leadNotes.id,
      leadId: leadNotes.leadId,
      body: leadNotes.body,
      kind: leadNotes.kind,
      createdAt: leadNotes.createdAt,
      employeeName: employees.name,
    }).from(customerLeadLinks)
      .innerJoin(leadNotes, eq(customerLeadLinks.leadId, leadNotes.leadId))
      .leftJoin(employees, eq(leadNotes.employeeId, employees.id))
      .where(eq(customerLeadLinks.customerId, id))
      .orderBy(desc(leadNotes.createdAt))
      .limit(100),
    db.select({
      id: leadCallActivities.id,
      leadId: leadCallActivities.leadId,
      calledAt: leadCallActivities.calledAt,
      reachedPerson: leadCallActivities.reachedPerson,
      reaction: leadCallActivities.reaction,
      outcome: leadCallActivities.outcome,
      note: leadCallActivities.note,
      employeeName: employees.name,
    }).from(customerLeadLinks)
      .innerJoin(leadCallActivities, eq(customerLeadLinks.leadId, leadCallActivities.leadId))
      .leftJoin(employees, eq(leadCallActivities.employeeId, employees.id))
      .where(eq(customerLeadLinks.customerId, id))
      .orderBy(desc(leadCallActivities.calledAt))
      .limit(100),
    db.select({
      id: orderStatusHistory.id,
      orderId: orderStatusHistory.orderId,
      orderNumber: orders.orderNumber,
      fromStatus: orderStatusHistory.fromStatus,
      toStatus: orderStatusHistory.toStatus,
      note: orderStatusHistory.note,
      createdAt: orderStatusHistory.createdAt,
    }).from(orderStatusHistory)
      .innerJoin(orders, eq(orderStatusHistory.orderId, orders.id))
      .where(and(eq(orders.customerId, id), orderAccess(user)))
      .orderBy(desc(orderStatusHistory.createdAt))
      .limit(120),
    canService
      ? db.select({
          id: serviceCases.id,
          caseNumber: serviceCases.caseNumber,
          type: serviceCases.type,
          status: serviceCases.status,
          priority: serviceCases.priority,
          subject: serviceCases.subject,
          dueAt: serviceCases.dueAt,
          lastActivityAt: serviceCases.lastActivityAt,
          createdAt: serviceCases.createdAt,
        }).from(serviceCases)
          .where(serviceAccess)
          .orderBy(desc(serviceCases.lastActivityAt))
          .limit(100)
      : Promise.resolve([]),
    canService
      ? db.select({
          id: serviceCaseEvents.id,
          serviceCaseId: serviceCaseEvents.serviceCaseId,
          caseNumber: serviceCases.caseNumber,
          subject: serviceCases.subject,
          type: serviceCaseEvents.type,
          fromValue: serviceCaseEvents.fromValue,
          toValue: serviceCaseEvents.toValue,
          note: serviceCaseEvents.note,
          createdAt: serviceCaseEvents.createdAt,
          actorName: employees.name,
        }).from(serviceCaseEvents)
          .innerJoin(serviceCases, eq(serviceCaseEvents.serviceCaseId, serviceCases.id))
          .leftJoin(employees, eq(serviceCaseEvents.actorEmployeeId, employees.id))
          .where(serviceAccess)
          .orderBy(desc(serviceCaseEvents.createdAt))
          .limit(160)
      : Promise.resolve([]),
    db.selectDistinct({ category: products.category })
      .from(products)
      .where(eq(products.active, true))
      .orderBy(products.category),
  ]);

  const profile = profileRows[0] ?? null;
  const timeline: Array<{
    key: string;
    kind: "customer" | "activity" | "lead" | "lead_note" | "lead_call" | "order" | "order_status" | "task" | "referral" | "opportunity" | "service_case" | "service_event";
    title: string;
    detail: string;
    at: Date;
    href?: string;
    tone?: "normal" | "good" | "attention";
  }> = [{
    key: "customer-created-" + base.customer.id,
    kind: "customer",
    title: "Kundenakte angelegt",
    detail: base.customer.customerNumber,
    at: base.customer.createdAt,
    tone: "good",
  }];

  for (const row of activities) {
    timeline.push({
      key: "activity-" + row.activity.id,
      kind: "activity",
      title: ({ call: "Kundenanruf", email: "E-Mail", whatsapp: "WhatsApp", meeting: "Kundentermin", review: "Bestandscheck", note: "Interne Notiz" } as Record<string, string>)[row.activity.type] ?? "Kundenaktivität",
      detail: [row.activity.outcome, row.activity.note, row.employeeName].filter(Boolean).join(" · ") || "Aktivität dokumentiert",
      at: row.activity.occurredAt,
      tone: row.activity.type === "review" ? "good" : "normal",
    });
  }
  for (const lead of linkedLeads) {
    timeline.push({
      key: "lead-" + lead.id,
      kind: "lead",
      title: "Lead " + (lead.status === "abgeschlossen" ? "abgeschlossen" : "verknüpft"),
      detail: [lead.topic, lead.source, lead.priority].filter(Boolean).join(" · "),
      at: lead.updatedAt ?? lead.createdAt,
      href: "/portal/leads/" + lead.id,
      tone: lead.status === "abgeschlossen" ? "good" : "normal",
    });
  }
  for (const note of linkedLeadNotes) {
    timeline.push({
      key: "lead-note-" + note.id,
      kind: "lead_note",
      title: note.kind === "system" ? "Lead-Systemverlauf" : "Lead-Notiz",
      detail: [note.body, note.employeeName].filter(Boolean).join(" · "),
      at: note.createdAt,
      href: "/portal/leads/" + note.leadId,
    });
  }
  for (const call of linkedLeadCalls) {
    timeline.push({
      key: "lead-call-" + call.id,
      kind: "lead_call",
      title: "Lead-Anruf",
      detail: [call.reachedPerson, call.reaction, call.outcome, call.note, call.employeeName].filter(Boolean).join(" · "),
      at: call.calledAt,
      href: "/portal/leads/" + call.leadId,
    });
  }
  for (const row of base.orders) {
    timeline.push({
      key: "order-" + row.order.id,
      kind: "order",
      title: "Auftrag " + row.order.orderNumber,
      detail: [row.providerName, row.productName, row.order.status].filter(Boolean).join(" · "),
      at: row.order.createdAt,
      href: "/portal/auftraege/" + row.order.id,
      tone: row.order.status === "active" ? "good" : ["documents_missing", "rejected", "storno"].includes(row.order.status) ? "attention" : "normal",
    });
  }
  for (const history of customerOrderHistory) {
    timeline.push({
      key: "order-status-" + history.id,
      kind: "order_status",
      title: history.orderNumber + " · Status",
      detail: (history.fromStatus ? history.fromStatus + " → " : "") + history.toStatus + (history.note ? " · " + history.note : ""),
      at: history.createdAt,
      href: "/portal/auftraege/" + history.orderId,
      tone: ["rejected", "cancelled", "storno", "documents_missing"].includes(history.toStatus) ? "attention" : history.toStatus === "active" ? "good" : "normal",
    });
  }
  for (const serviceCase of customerServiceCases) {
    timeline.push({
      key: "service-case-" + serviceCase.id,
      kind: "service_case",
      title: serviceCase.caseNumber + " · " + serviceCase.subject,
      detail: [serviceCase.type, serviceCase.status, serviceCase.priority].filter(Boolean).join(" · "),
      at: serviceCase.lastActivityAt,
      href: "/portal/service/" + serviceCase.id,
      tone: serviceCase.status === "resolved" || serviceCase.status === "closed"
        ? "good"
        : serviceCase.priority === "critical" || serviceCase.dueAt.getTime() < Date.now()
          ? "attention"
          : "normal",
    });
  }
  for (const event of customerServiceEvents) {
    timeline.push({
      key: "service-event-" + event.id,
      kind: "service_event",
      title: event.caseNumber + " · " + ({
        created: "Servicefall angelegt",
        status_changed: "Servicestatus geändert",
        priority_changed: "Servicepriorität geändert",
        assigned: "Service-Zuständigkeit geändert",
        resolution: "Servicelösung dokumentiert",
        note: "Service-Notiz",
      } as Record<string, string>)[event.type] ?? "Service-Aktivität",
      detail: [
        event.fromValue && event.toValue ? event.fromValue + " → " + event.toValue : event.toValue || event.fromValue,
        event.note,
        event.actorName,
      ].filter(Boolean).join(" · "),
      at: event.createdAt,
      href: "/portal/service/" + event.serviceCaseId,
      tone: event.type === "resolution" ? "good" : event.type === "priority_changed" && event.toValue === "critical" ? "attention" : "normal",
    });
  }
  for (const task of base.tasks) {
    timeline.push({
      key: "task-" + task.id,
      kind: "task",
      title: task.status === "completed" ? "Aufgabe erledigt" : "Kundenaufgabe",
      detail: task.title + (task.dueAt ? " · fällig " + task.dueAt.toLocaleString("de-DE") : ""),
      at: task.updatedAt,
      href: "/portal/aufgaben",
      tone: task.status === "completed" ? "good" : task.dueAt && task.dueAt.getTime() < Date.now() ? "attention" : "normal",
    });
  }
  for (const referral of base.referrals) {
    timeline.push({
      key: "referral-" + referral.id,
      kind: "referral",
      title: "Empfehlung erfasst",
      detail: referral.targetCustomerName || referral.leadName || referral.leadEmail || referral.leadPhone || "Empfohlener Kontakt",
      at: referral.createdAt,
      href: referral.referredCustomerId ? "/portal/kunden/" + referral.referredCustomerId : referral.referredLeadId ? "/portal/leads/" + referral.referredLeadId : undefined,
      tone: referral.referredCustomerId ? "good" : "normal",
    });
  }
  for (const row of opportunities) {
    timeline.push({
      key: "opportunity-" + row.opportunity.id,
      kind: "opportunity",
      title: "Opportunity · " + row.opportunity.topic,
      detail: [row.providerName, row.productName, row.opportunity.status, row.opportunity.priority, row.opportunity.note].filter(Boolean).join(" · "),
      at: row.opportunity.updatedAt,
      tone: row.opportunity.status === "won" ? "good" : row.opportunity.status === "lost" ? "attention" : "normal",
    });
  }

  timeline.sort((a, b) => b.at.getTime() - a.at.getTime());

  const intelligence = getCustomerIntelligence({
    customer: {
      createdAt: base.customer.createdAt,
      email: base.customer.email,
      phone: base.customer.phone,
      preferredChannel: base.customer.preferredChannel,
    },
    profile,
    orders: base.orders.map((row) => ({
      status: row.order.status,
      category: row.productCategory,
      productName: row.productName,
      createdAt: row.order.createdAt,
      updatedAt: row.order.updatedAt,
    })),
    tasks: base.tasks.map((task) => ({
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt,
    })),
    activities: activities.map((row) => ({
      type: row.activity.type,
      occurredAt: row.activity.occurredAt,
      nextActionAt: row.activity.nextActionAt,
    })),
    opportunities: opportunities.map((row) => ({
      status: row.opportunity.status,
      priority: row.opportunity.priority,
      topic: row.opportunity.topic,
      category: row.productCategory,
      nextReviewAt: row.opportunity.nextReviewAt,
    })),
    referralCount: base.referrals.length,
    availableCategories: categoryRows.map((row) => row.category),
  });

  return {
    ...base,
    profile,
    activities,
    opportunities,
    linkedLeads,
    serviceCases: customerServiceCases,
    timeline: timeline.slice(0, 180),
    intelligence,
    availableProducts: await db.select({
      id: products.id,
      name: products.name,
      category: products.category,
      providerName: providers.name,
    }).from(products)
      .innerJoin(providers, eq(products.providerId, providers.id))
      .where(eq(products.active, true))
      .orderBy(products.category, providers.name, products.name),
  };
}

export async function updateCustomerCrmProfile(id: number, input: {
  lifecycleStage?: string;
  relationshipStatus?: string;
  riskLevel?: string;
  nextReviewAt?: string | null;
  note?: string;
}, user: SessionUser) {
  return db.transaction(async (tx) => {
    const [customer] = await tx.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.id, id), customerAccess(user), isNull(customers.archivedAt)))
      .limit(1)
      .for("update");
    if (!customer) throw new Error("Kunde nicht gefunden.");

    const patch = {
      ...(input.lifecycleStage !== undefined ? { lifecycleStage: input.lifecycleStage } : {}),
      ...(input.relationshipStatus !== undefined ? { relationshipStatus: input.relationshipStatus } : {}),
      ...(input.riskLevel !== undefined ? { riskLevel: input.riskLevel } : {}),
      ...(input.nextReviewAt !== undefined ? { nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null } : {}),
      ...(input.note !== undefined ? { note: input.note.trim() } : {}),
      updatedByEmployeeId: user.id,
      updatedAt: new Date(),
    };
    const [profile] = await tx.insert(customerCrmProfiles).values({
      customerId: id,
      ...patch,
    }).onConflictDoUpdate({
      target: customerCrmProfiles.customerId,
      set: patch,
    }).returning();

    await writeAudit(tx, user.id, "customer.crm.updated", "customer", id, undefined, {
      lifecycleStage: profile.lifecycleStage,
      relationshipStatus: profile.relationshipStatus,
      riskLevel: profile.riskLevel,
      nextReviewAt: profile.nextReviewAt?.toISOString() ?? null,
    });
    await emitEvent(tx, "customer.crm.updated", "customer", id, { assignedEmployeeId: user.id });
    return profile;
  });
}

export async function createCustomerActivity(id: number, input: {
  type: string;
  direction: string;
  outcome?: string;
  note?: string;
  occurredAt?: string;
  nextActionAt?: string | null;
}, user: SessionUser) {
  return db.transaction(async (tx) => {
    const [customer] = await tx.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.id, id), customerAccess(user), isNull(customers.archivedAt)))
      .limit(1)
      .for("update");
    if (!customer) throw new Error("Kunde nicht gefunden.");

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    const nextActionAt = input.nextActionAt ? new Date(input.nextActionAt) : null;
    const [activity] = await tx.insert(customerActivities).values({
      customerId: id,
      employeeId: user.id,
      type: input.type,
      direction: input.direction,
      outcome: input.outcome?.trim() || "",
      note: input.note?.trim() || "",
      occurredAt,
      nextActionAt,
    }).returning();

    if (input.type !== "note") {
      await tx.insert(customerCrmProfiles).values({
        customerId: id,
        lastContactAt: occurredAt,
        lastContactChannel: input.type,
        updatedByEmployeeId: user.id,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: customerCrmProfiles.customerId,
        set: {
          lastContactAt: occurredAt,
          lastContactChannel: input.type,
          updatedByEmployeeId: user.id,
          updatedAt: new Date(),
        },
      });
    }

    if (nextActionAt) {
      await tx.insert(tasks).values({
        entityType: "customer",
        entityId: id,
        assignedToEmployeeId: user.id,
        createdByEmployeeId: user.id,
        type: "customer_follow_up",
        title: "Kunden-Wiedervorlage",
        description: [input.outcome, input.note].filter(Boolean).join(" · ") || null,
        priority: "normal",
        dueAt: nextActionAt,
      });
    }

    await writeAudit(tx, user.id, "customer.activity.created", "customer", id, undefined, {
      activityId: activity.id,
      type: activity.type,
      direction: activity.direction,
      outcome: activity.outcome,
      nextActionAt: activity.nextActionAt?.toISOString() ?? null,
    });
    const activityPayload = { assignedEmployeeId: user.id, activityType: activity.type };
    await emitEvent(tx, "customer.activity.created", "customer", id, activityPayload);
    await runAutomationEvent(tx, "customer.activity.created", "customer", id, activityPayload, user.id);
    return activity;
  });
}

export async function createCustomerOpportunity(id: number, input: {
  productId?: number | null;
  topic: string;
  status: string;
  priority: string;
  source?: string;
  note?: string;
  nextReviewAt?: string | null;
}, user: SessionUser) {
  return db.transaction(async (tx) => {
    const [customer] = await tx.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.id, id), customerAccess(user), isNull(customers.archivedAt)))
      .limit(1)
      .for("update");
    if (!customer) throw new Error("Kunde nicht gefunden.");

    let productId = input.productId ?? null;
    if (productId) {
      const [product] = await tx.select({ id: products.id }).from(products)
        .where(and(eq(products.id, productId), eq(products.active, true))).limit(1);
      if (!product) throw new Error("Produkt nicht gefunden.");
      productId = product.id;
    }

    const [opportunity] = await tx.insert(customerOpportunities).values({
      customerId: id,
      productId,
      topic: input.topic.trim(),
      status: input.status,
      priority: input.priority,
      source: input.source?.trim() || "manual",
      note: input.note?.trim() || "",
      nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
      createdByEmployeeId: user.id,
    }).returning();

    await writeAudit(tx, user.id, "customer.opportunity.created", "customer", id, undefined, {
      opportunityId: opportunity.id,
      productId: opportunity.productId,
      topic: opportunity.topic,
      status: opportunity.status,
      priority: opportunity.priority,
    });
    await emitEvent(tx, "customer.opportunity.created", "customer", id, { assignedEmployeeId: user.id, opportunityId: opportunity.id });
    return opportunity;
  });
}

export async function updateCustomerOpportunity(customerId: number, opportunityId: number, input: {
  productId?: number | null;
  topic?: string;
  status?: string;
  priority?: string;
  note?: string;
  nextReviewAt?: string | null;
}, user: SessionUser) {
  return db.transaction(async (tx) => {
    const [customer] = await tx.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.id, customerId), customerAccess(user), isNull(customers.archivedAt)))
      .limit(1);
    if (!customer) throw new Error("Kunde nicht gefunden.");

    const [existing] = await tx.select().from(customerOpportunities)
      .where(and(eq(customerOpportunities.id, opportunityId), eq(customerOpportunities.customerId, customerId)))
      .limit(1)
      .for("update");
    if (!existing) throw new Error("Opportunity nicht gefunden.");

    if (input.productId) {
      const [product] = await tx.select({ id: products.id }).from(products)
        .where(and(eq(products.id, input.productId), eq(products.active, true))).limit(1);
      if (!product) throw new Error("Produkt nicht gefunden.");
    }

    const patch: Partial<typeof customerOpportunities.$inferInsert> = { updatedAt: new Date() };
    if (input.productId !== undefined) patch.productId = input.productId;
    if (input.topic !== undefined) patch.topic = input.topic.trim();
    if (input.status !== undefined) patch.status = input.status;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.note !== undefined) patch.note = input.note.trim();
    if (input.nextReviewAt !== undefined) patch.nextReviewAt = input.nextReviewAt ? new Date(input.nextReviewAt) : null;

    const [updated] = await tx.update(customerOpportunities).set(patch)
      .where(eq(customerOpportunities.id, opportunityId))
      .returning();

    await writeAudit(tx, user.id, "customer.opportunity.updated", "customer", customerId, {
      opportunityId: existing.id,
      status: existing.status,
      priority: existing.priority,
      productId: existing.productId,
      topic: existing.topic,
    }, {
      opportunityId: updated.id,
      status: updated.status,
      priority: updated.priority,
      productId: updated.productId,
      topic: updated.topic,
    });
    await emitEvent(tx, "customer.opportunity.updated", "customer", customerId, { assignedEmployeeId: user.id, opportunityId });
    return updated;
  });
}

export async function listCatalog() {
  const [providerRows, productRows] = await Promise.all([
    db.select().from(providers).where(eq(providers.active, true)).orderBy(providers.name),
    db.select().from(products).where(eq(products.active, true)).orderBy(products.name),
  ]);
  return { providers: providerRows, products: productRows };
}

export async function listOrders(
  user: SessionUser,
  filter?: {
    status?: string;
    search?: string;
    page?: number;
    lookahead?: boolean;
    providerId?: number;
    advisorEmployeeId?: number;
    focus?: "attention" | "provider_warning" | "documents" | "activation" | "unassigned";
  },
  limit = 150,
) {
  const operationsPolicy = await getOperationsPolicy();
  const policyCutoffs = operationsPolicyCutoffs(operationsPolicy);
  const attentionCondition = sql`${orders.status} not in ('active','rejected','cancelled','storno')
    and (
      (${orders.status} = 'documents_missing' and ${orders.updatedAt} < ${policyCutoffs.documentsStaleAt})
      or ${orders.updatedAt} < ${policyCutoffs.orderStaleAt}
    )`;
  const providerWarningCondition = sql`${orders.status} not in ('draft','active','rejected','cancelled','storno')
    and (
      (${orders.externalOrderId} is null and ${orders.submittedAt} is not null and ${orders.submittedAt} < ${policyCutoffs.providerReferenceMissingAt})
      or (${orders.providerStatus} is null and ${orders.submittedAt} is not null and ${orders.submittedAt} < ${policyCutoffs.providerStatusMissingAt})
      or (${orders.status} = 'activation_pending' and ${orders.updatedAt} < ${policyCutoffs.activationStaleAt})
      or (${orders.status} = 'documents_missing' and ${orders.updatedAt} < ${policyCutoffs.documentsStaleAt})
    )`;

  const conditions = [orderAccess(user)];
  if (filter?.status) conditions.push(eq(orders.status, filter.status));
  if (filter?.providerId && Number.isSafeInteger(filter.providerId) && filter.providerId > 0) {
    conditions.push(eq(orders.providerId, filter.providerId));
  }
  if (filter?.advisorEmployeeId && Number.isSafeInteger(filter.advisorEmployeeId) && filter.advisorEmployeeId > 0) {
    conditions.push(eq(orders.advisorEmployeeId, filter.advisorEmployeeId));
  }
  if (filter?.focus === "attention") {
    conditions.push(attentionCondition);
  } else if (filter?.focus === "provider_warning") {
    conditions.push(providerWarningCondition);
  } else if (filter?.focus === "documents") {
    conditions.push(eq(orders.status, "documents_missing"));
  } else if (filter?.focus === "activation") {
    conditions.push(eq(orders.status, "activation_pending"));
  } else if (filter?.focus === "unassigned") {
    conditions.push(isNull(orders.advisorEmployeeId));
  }

  const search = filter?.search?.trim().slice(0, 200);
  const searchPattern = search ? `%${search.replace(/[\\%_]/g, "\\$&")}%` : undefined;
  if (searchPattern) conditions.push(or(
    ilike(orders.orderNumber, searchPattern),
    ilike(orders.externalOrderId, searchPattern),
    ilike(customers.customerNumber, searchPattern),
    ilike(customers.firstName, searchPattern),
    ilike(customers.lastName, searchPattern),
    ilike(customers.companyName, searchPattern),
    ilike(providers.name, searchPattern),
    ilike(products.name, searchPattern),
  )!);
  const page = Number.isSafeInteger(filter?.page) && Number(filter?.page) > 0 ? Number(filter?.page) : 1;
  const pageSize = Math.max(1, Math.min(limit, 300));
  const queryLimit = pageSize + (filter?.lookahead ? 1 : 0);
  const offset = (page - 1) * pageSize;

  return db.select({
    order: orders,
    customer: customers,
    providerName: providers.name,
    productName: products.name,
    advisorName: employees.name,
    operationalAttention: sql<boolean>`coalesce(${attentionCondition}, false)`,
    providerWarning: sql<boolean>`coalesce(${providerWarningCondition}, false)`,
  }).from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(providers, eq(orders.providerId, providers.id))
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(employees, eq(orders.advisorEmployeeId, employees.id))
    .where(and(...conditions))
    .orderBy(
      sql`case when ${attentionCondition} then 0 else 1 end`,
      desc(orders.updatedAt),
      desc(orders.id),
    )
    .limit(queryLimit)
    .offset(offset);
}

export async function listOrderWorkqueueProviders(user: SessionUser) {
  return db.selectDistinct({
    id: providers.id,
    name: providers.name,
  }).from(orders)
    .innerJoin(providers, eq(orders.providerId, providers.id))
    .where(orderAccess(user))
    .orderBy(providers.name);
}

export async function getOrder(id: number, user: SessionUser) {
  const [row] = await db.select({
    order: orders,
    customer: customers,
    providerName: providers.name,
    productName: products.name,
    advisorName: employees.name,
  }).from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(providers, eq(orders.providerId, providers.id))
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(employees, eq(orders.advisorEmployeeId, employees.id))
    .where(and(eq(orders.id, id), orderAccess(user)))
    .limit(1);
  if (!row) return null;
  const [history, commissions, orderTasks] = await Promise.all([
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id)).orderBy(desc(orderStatusHistory.createdAt)),
    db.select().from(commissionEvents).where(eq(commissionEvents.orderId, id)).orderBy(desc(commissionEvents.createdAt)),
    db.select().from(tasks).where(and(eq(tasks.entityType, "order"), eq(tasks.entityId, id), taskAccess(user))).orderBy(desc(tasks.createdAt)),
  ]);
  return { ...row, history, commissions, tasks: orderTasks };
}

export async function createOrder(input: {
  customerId?: number;
  leadId?: number;
  providerId: number;
  productId?: number | null;
  externalOrderId?: string;
  expectedCommission?: string | number | null;
  note?: string;
}, user: SessionUser) {
  let customerId = input.customerId;
  if (!customerId && input.leadId) customerId = (await ensureCustomerForLead(input.leadId, user)).id;
  if (!customerId) throw new Error("Kunde oder Lead fehlt.");

  return db.transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(and(eq(customers.id, customerId!), customerAccess(user))).limit(1);
    if (!customer) throw new Error("Kunde nicht gefunden.");
    const [provider] = await tx.select().from(providers).where(and(eq(providers.id, input.providerId), eq(providers.active, true))).limit(1);
    if (!provider) throw new Error("Provider nicht gefunden.");
    let product: typeof products.$inferSelect | null = null;
    if (input.productId) {
      [product] = await tx.select().from(products).where(and(eq(products.id, input.productId), eq(products.providerId, provider.id), eq(products.active, true))).limit(1);
      if (!product) throw new Error("Produkt nicht gefunden.");

      const [catalogProfile] = await tx.select({ trainingRequired: productCatalogProfiles.trainingRequired })
        .from(productCatalogProfiles).where(eq(productCatalogProfiles.productId, product.id)).limit(1);
      if (catalogProfile?.trainingRequired) {
        const requiredModules = await tx.select({ id: trainingModules.id }).from(trainingModules)
          .where(and(eq(trainingModules.productId, product.id), eq(trainingModules.required, true), eq(trainingModules.active, true)));
        if (!requiredModules.length) throw new Error("Für dieses Produkt ist eine Schulungsfreigabe erforderlich, aber noch keine Pflichtschulung hinterlegt.");
        const requiredIds = requiredModules.map((module) => module.id);
        const completions = await tx.select({ moduleId: employeeTrainingCompletions.moduleId })
          .from(employeeTrainingCompletions)
          .where(and(
            eq(employeeTrainingCompletions.employeeId, user.id),
            eq(employeeTrainingCompletions.status, "completed"),
            inArray(employeeTrainingCompletions.moduleId, requiredIds),
            or(isNull(employeeTrainingCompletions.expiresAt), gte(employeeTrainingCompletions.expiresAt, new Date())),
          ));
        const completedIds = new Set(completions.map((completion) => completion.moduleId));
        if (requiredIds.some((id) => !completedIds.has(id))) throw new Error("Für dieses Produkt fehlt Ihnen noch eine gültige Pflichtschulung.");
      }
    }
    const canOverrideCommission = isCompensationOwner(user);
    const manualExpected = canOverrideCommission && input.expectedCommission !== null && input.expectedCommission !== undefined && input.expectedCommission !== ""
      ? String(input.expectedCommission)
      : null;
    const expected = manualExpected ?? product?.expectedCommission ?? null;
    const [created] = await tx.insert(orders).values({
      orderNumber: orderNumber(),
      customerId: customer.id,
      leadId: input.leadId ?? null,
      providerId: provider.id,
      productId: product?.id ?? null,
      advisorEmployeeId: user.id,
      createdByEmployeeId: user.id,
      status: "draft",
      externalOrderId: input.externalOrderId?.trim() || null,
      expectedCommission: expected,
      metadata: input.note ? { note: input.note } : undefined,
    }).returning();
    await tx.insert(orderStatusHistory).values({
      orderId: created.id,
      toStatus: "draft",
      note: "Auftrag angelegt.",
      actorEmployeeId: user.id,
    });
    if (expected) {
      await tx.insert(commissionEvents).values({
        orderId: created.id,
        employeeId: user.id,
        type: "sale",
        status: "expected",
        expectedAmount: expected,
      });
    }
    await writeAudit(tx, user.id, "order.created", "order", created.id, undefined, {
      orderNumber: created.orderNumber,
      customerId: created.customerId,
      providerId: created.providerId,
      productId: created.productId,
    });
    await emitEvent(tx, "order.created", "order", created.id, {
      assignedEmployeeId: user.id,
      customerId: created.customerId,
      providerId: created.providerId,
    });
    await runAutomationEvent(tx, "order.created", "order", created.id, { assignedEmployeeId: user.id }, user.id);
    return created;
  });
}

const STATUS_TIMESTAMPS: Record<string, "submittedAt" | "acceptedAt" | "activatedAt" | "cancelledAt" | undefined> = {
  submitted: "submittedAt",
  accepted: "acceptedAt",
  active: "activatedAt",
  cancelled: "cancelledAt",
  storno: "cancelledAt",
};

export async function updateOrder(id: number, input: {
  status?: string;
  providerStatus?: string | null;
  externalOrderId?: string | null;
  cancellationReason?: string | null;
  note?: string;
}, user: SessionUser) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(orders).where(and(eq(orders.id, id), orderAccess(user))).limit(1).for("update");
    if (!existing) throw new Error("Auftrag nicht gefunden.");
    if (input.status && input.status !== existing.status && ["cancelled", "storno"].includes(existing.status)) {
      throw new Error("Stornierte Aufträge können nicht reaktiviert werden. Bitte einen neuen Auftrag anlegen.");
    }
    const patch: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };
    if (input.status && input.status !== existing.status) {
      patch.status = input.status;
      const timestamp = STATUS_TIMESTAMPS[input.status];
      if (timestamp) patch[timestamp] = new Date();
      if ((input.status === "cancelled" || input.status === "storno") && input.cancellationReason) patch.cancellationReason = input.cancellationReason;
    }
    if (input.providerStatus !== undefined) patch.providerStatus = input.providerStatus || null;
    if (input.externalOrderId !== undefined) patch.externalOrderId = input.externalOrderId?.trim() || null;
    const [updated] = await tx.update(orders).set(patch).where(eq(orders.id, id)).returning();

    if (input.status && input.status !== existing.status) {
      await tx.insert(orderStatusHistory).values({
        orderId: id,
        fromStatus: existing.status,
        toStatus: input.status,
        providerStatus: input.providerStatus ?? updated.providerStatus,
        note: input.note?.trim() || null,
        actorEmployeeId: user.id,
      });
      if (["accepted", "active"].includes(input.status)) {
        await tx.update(commissionEvents).set({
          status: input.status === "active" ? "confirmed" : "provider_confirmed",
          confirmedAmount: existing.expectedCommission,
          updatedAt: new Date(),
        }).where(and(eq(commissionEvents.orderId, id), eq(commissionEvents.type, "sale")));
      }
      if (["cancelled", "storno"].includes(input.status)) {
        const [existingChargeback] = await tx.select({ id: commissionEvents.id }).from(commissionEvents)
          .where(and(eq(commissionEvents.orderId, id), eq(commissionEvents.type, "chargeback"))).limit(1);
        const [saleEvent] = await tx.select({
          id: commissionEvents.id,
          paidAmount: commissionEvents.paidAmount,
        }).from(commissionEvents)
          .where(and(eq(commissionEvents.orderId, id), eq(commissionEvents.type, "sale"))).limit(1);
        if (!existingChargeback) {
          const amount = Number(existing.expectedCommission ?? 0);
          await tx.insert(commissionEvents).values({
            orderId: id,
            employeeId: existing.advisorEmployeeId,
            type: "chargeback",
            status: "open",
            expectedAmount: amount ? String(-Math.abs(amount)) : null,
          });
        }
        const paidAmount = Number(saleEvent?.paidAmount ?? 0);
        if (saleEvent && paidAmount > 0) {
          const reversalAmount = Math.round((paidAmount * 0.15 + Number.EPSILON) * 100) / 100;
          await tx.insert(benefitPoolLedger).values({
            entryType: "spend",
            category: "growth_pool",
            amount: String(reversalAmount),
            note: "Automatische Gegenbuchung des 15-%-Pools wegen Storno.",
            reference: existing.orderNumber,
            sourceKey: `commission-chargeback:${saleEvent.id}`,
            createdByEmployeeId: user.id,
          }).onConflictDoUpdate({
            target: benefitPoolLedger.sourceKey,
            set: {
              entryType: "spend",
              category: "growth_pool",
              amount: String(reversalAmount),
              note: "Automatische Gegenbuchung des 15-%-Pools wegen Storno.",
              reference: existing.orderNumber,
              createdByEmployeeId: user.id,
            },
          });
        }
      }
      if (input.status === "documents_missing") {
        await tx.insert(tasks).values({
          entityType: "order",
          entityId: id,
          assignedToEmployeeId: existing.advisorEmployeeId ?? user.id,
          createdByEmployeeId: user.id,
          type: "documents",
          title: "Fehlende Unterlagen beim Kunden anfordern",
          priority: "high",
          dueAt: new Date(Date.now() + 24 * 60 * 60_000),
        });
      }
      await emitEvent(tx, `order.status.${input.status}`, "order", id, {
        assignedEmployeeId: existing.advisorEmployeeId ?? user.id,
        previousStatus: existing.status,
        status: input.status,
      });
      await runAutomationEvent(tx, `order.status.${input.status}`, "order", id, {
        assignedEmployeeId: existing.advisorEmployeeId ?? user.id,
        previousStatus: existing.status,
        status: input.status,
      }, user.id);
      await syncReferralRewardForOrder(tx, id, input.status, user.id);
    }
    await writeAudit(tx, user.id, "order.updated", "order", id,
      { status: existing.status, providerStatus: existing.providerStatus, externalOrderId: existing.externalOrderId },
      { status: updated.status, providerStatus: updated.providerStatus, externalOrderId: updated.externalOrderId });
    return updated;
  });
}

export async function listTasks(
  user: SessionUser,
  status = "open",
  options?: {
    page?: number;
    pageSize?: number;
    lookahead?: boolean;
    priority?: "low" | "normal" | "high" | "critical";
    due?: "overdue" | "today" | "upcoming" | "no_due";
    assigneeId?: number;
    entityType?: "general" | "lead" | "customer" | "order" | "service_case";
    search?: string;
  },
) {
  const conditions = [taskAccess(user)];
  if (status !== "all") conditions.push(eq(tasks.status, status));
  if (options?.priority) conditions.push(eq(tasks.priority, options.priority));
  if (options?.assigneeId && Number.isSafeInteger(options.assigneeId) && options.assigneeId > 0) {
    conditions.push(eq(tasks.assignedToEmployeeId, options.assigneeId));
  }
  if (options?.entityType) conditions.push(eq(tasks.entityType, options.entityType));
  const search = options?.search?.trim();
  if (search) {
    conditions.push(or(
      ilike(tasks.title, `%${search}%`),
      ilike(tasks.description, `%${search}%`),
    )!);
  }
  if (options?.due === "overdue") {
    conditions.push(sql`${tasks.dueAt} is not null
      and ${tasks.dueAt} < now()
      and ${tasks.status} in ('open','in_progress')`);
  } else if (options?.due === "today") {
    conditions.push(sql`${tasks.dueAt} >= (date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin')
      and ${tasks.dueAt} < ((date_trunc('day', now() at time zone 'Europe/Berlin') + interval '1 day') at time zone 'Europe/Berlin')
      and ${tasks.status} in ('open','in_progress')`);
  } else if (options?.due === "upcoming") {
    conditions.push(sql`${tasks.dueAt} >= ((date_trunc('day', now() at time zone 'Europe/Berlin') + interval '1 day') at time zone 'Europe/Berlin')
      and ${tasks.status} in ('open','in_progress')`);
  } else if (options?.due === "no_due") {
    conditions.push(isNull(tasks.dueAt));
  }

  const page = Number.isSafeInteger(options?.page) && Number(options?.page) > 0 ? Number(options?.page) : 1;
  const pageSize = Number.isSafeInteger(options?.pageSize) && Number(options?.pageSize) > 0
    ? Math.min(Number(options?.pageSize), 300)
    : 300;
  const queryLimit = pageSize + (options?.lookahead ? 1 : 0);
  const offset = (page - 1) * pageSize;

  const rows = await db.select({
    task: tasks,
    assigneeName: employees.name,
    overdue: sql<boolean>`coalesce(${tasks.status} in ('open','in_progress') and ${tasks.dueAt} is not null and ${tasks.dueAt} < now(), false)`,
  }).from(tasks)
    .leftJoin(employees, eq(tasks.assignedToEmployeeId, employees.id))
    .where(and(...conditions))
    .orderBy(sql`case when ${tasks.dueAt} is null then 1 else 0 end`, tasks.dueAt, desc(tasks.createdAt), desc(tasks.id))
    .limit(queryLimit)
    .offset(offset);

  const capabilities = await permissionSnapshot(user, [
    PORTAL_PERMISSION.LEAD_EDIT,
    PORTAL_PERMISSION.CUSTOMER_READ,
    PORTAL_PERMISSION.CUSTOMER_EDIT,
    PORTAL_PERMISSION.ORDER_READ,
    PORTAL_PERMISSION.ORDER_EDIT,
    PORTAL_PERMISSION.SERVICE_READ,
    PORTAL_PERMISSION.SERVICE_EDIT,
    PORTAL_PERMISSION.SERVICE_ASSIGN,
  ] as const);
  const canLead = capabilities[PORTAL_PERMISSION.LEAD_EDIT];
  const canCustomer = capabilities[PORTAL_PERMISSION.CUSTOMER_READ] || capabilities[PORTAL_PERMISSION.CUSTOMER_EDIT];
  const canOrder = capabilities[PORTAL_PERMISSION.ORDER_READ] || capabilities[PORTAL_PERMISSION.ORDER_EDIT];
  const canServiceAssign = capabilities[PORTAL_PERMISSION.SERVICE_ASSIGN] || user.role === "admin";
  const canService = capabilities[PORTAL_PERMISSION.SERVICE_READ] || capabilities[PORTAL_PERMISSION.SERVICE_EDIT] || canServiceAssign;

  const leadIds = [...new Set(rows.filter((row) => row.task.entityType === "lead").map((row) => row.task.entityId))];
  const customerIds = [...new Set(rows.filter((row) => row.task.entityType === "customer").map((row) => row.task.entityId))];
  const orderIds = [...new Set(rows.filter((row) => row.task.entityType === "order").map((row) => row.task.entityId))];
  const serviceCaseIds = [...new Set(rows.filter((row) => row.task.entityType === "service_case").map((row) => row.task.entityId))];

  const [leadRows, customerRows, orderRows, serviceRows] = await Promise.all([
    canLead && leadIds.length
      ? db.select({
          id: leads.id,
          name: leads.name,
          topic: leads.topic,
          phone: leads.phone,
          email: leads.email,
          companyName: sql<string | null>`nullif(${leads.meta}->>'companyName','')`,
        }).from(leads).where(and(inArray(leads.id, leadIds), leadAccessCondition(user)))
      : Promise.resolve([]),
    canCustomer && customerIds.length
      ? db.select({
          id: customers.id,
          customerNumber: customers.customerNumber,
          firstName: customers.firstName,
          lastName: customers.lastName,
          companyName: customers.companyName,
          phone: customers.phone,
          email: customers.email,
          city: customers.city,
        }).from(customers).where(and(inArray(customers.id, customerIds), customerAccess(user), isNull(customers.archivedAt)))
      : Promise.resolve([]),
    canOrder && orderIds.length
      ? db.select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
          customerCompanyName: customers.companyName,
          providerName: providers.name,
          productName: products.name,
        }).from(orders)
          .innerJoin(customers, eq(orders.customerId, customers.id))
          .innerJoin(providers, eq(orders.providerId, providers.id))
          .leftJoin(products, eq(orders.productId, products.id))
          .where(and(inArray(orders.id, orderIds), orderAccess(user)))
      : Promise.resolve([]),
    canService && serviceCaseIds.length
      ? db.select({
          id: serviceCases.id,
          caseNumber: serviceCases.caseNumber,
          subject: serviceCases.subject,
          status: serviceCases.status,
          customerNumber: customers.customerNumber,
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
          customerCompanyName: customers.companyName,
        }).from(serviceCases)
          .innerJoin(customers, eq(serviceCases.customerId, customers.id))
          .where(and(
            inArray(serviceCases.id, serviceCaseIds),
            canServiceAssign ? sql`true` : eq(serviceCases.ownerEmployeeId, user.id),
          ))
      : Promise.resolve([]),
  ]);

  const leadMap = new Map(leadRows.map((row) => [row.id, row]));
  const customerMap = new Map(customerRows.map((row) => [row.id, row]));
  const orderMap = new Map(orderRows.map((row) => [row.id, row]));
  const serviceMap = new Map(serviceRows.map((row) => [row.id, row]));

  return rows.map((row) => {
    let entityTitle: string | null = null;
    let entitySubtitle: string | null = null;
    let entityHref: string | null = null;

    if (row.task.entityType === "lead") {
      const lead = leadMap.get(row.task.entityId);
      if (lead) {
        entityTitle = lead.companyName || lead.name || `Lead #${lead.id}`;
        entitySubtitle = [lead.companyName ? lead.name : null, lead.topic, lead.phone || lead.email].filter(Boolean).join(" · ");
        entityHref = `/portal/leads/${lead.id}`;
      }
    } else if (row.task.entityType === "customer") {
      const customer = customerMap.get(row.task.entityId);
      if (customer) {
        entityTitle = customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.customerNumber;
        entitySubtitle = [customer.customerNumber, customer.city, customer.phone || customer.email].filter(Boolean).join(" · ");
        entityHref = `/portal/kunden/${customer.id}`;
      }
    } else if (row.task.entityType === "order") {
      const order = orderMap.get(row.task.entityId);
      if (order) {
        const customerName = order.customerCompanyName || [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ");
        entityTitle = customerName || order.orderNumber;
        entitySubtitle = [order.orderNumber, order.providerName, order.productName].filter(Boolean).join(" · ");
        entityHref = `/portal/auftraege/${order.id}`;
      }
    } else if (row.task.entityType === "service_case") {
      const serviceCase = serviceMap.get(row.task.entityId);
      if (serviceCase) {
        const customerName = serviceCase.customerCompanyName || [serviceCase.customerFirstName, serviceCase.customerLastName].filter(Boolean).join(" ");
        entityTitle = `${serviceCase.caseNumber} · ${serviceCase.subject}`;
        entitySubtitle = [customerName || serviceCase.customerNumber, serviceCase.status].filter(Boolean).join(" · ");
        entityHref = `/portal/service/${serviceCase.id}`;
      }
    }

    return { ...row, entityTitle, entitySubtitle, entityHref };
  });
}

export async function updateTask(id: number, input: { status?: string; dueAt?: Date | null; priority?: string }, user: SessionUser) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(tasks).where(and(eq(tasks.id, id), taskAccess(user))).limit(1).for("update");
    if (!existing) throw new Error("Aufgabe nicht gefunden.");
    const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
    if (input.status) {
      patch.status = input.status;
      patch.completedAt = input.status === "completed" ? new Date() : null;
    }
    if (input.dueAt !== undefined) patch.dueAt = input.dueAt;
    if (input.priority) patch.priority = input.priority;
    const [updated] = await tx.update(tasks).set(patch).where(eq(tasks.id, id)).returning();
    await writeAudit(tx, user.id, "task.updated", "task", id,
      { status: existing.status, dueAt: existing.dueAt, priority: existing.priority },
      { status: updated.status, dueAt: updated.dueAt, priority: updated.priority });
    return updated;
  });
}

export async function getFinanceStats(user: SessionUser) {
  const access = orderAccess(user);
  const rows = await db.select({
    status: commissionEvents.status,
    expected: sql<string>`coalesce(sum(${commissionEvents.expectedAmount}),0)::text`,
    confirmed: sql<string>`coalesce(sum(${commissionEvents.confirmedAmount}),0)::text`,
    paid: sql<string>`coalesce(sum(${commissionEvents.paidAmount}),0)::text`,
  }).from(commissionEvents)
    .innerJoin(orders, eq(commissionEvents.orderId, orders.id))
    .where(access)
    .groupBy(commissionEvents.status);

  const totals = rows.reduce((acc, row) => {
    acc.expected += Number(row.expected);
    acc.confirmed += Number(row.confirmed);
    acc.paid += Number(row.paid);
    return acc;
  }, { expected: 0, confirmed: 0, paid: 0 });

  const issues = user.role === "admin"
    ? await db.select().from(reconciliationIssues).where(eq(reconciliationIssues.status, "open")).orderBy(desc(reconciliationIssues.createdAt)).limit(50)
    : [];

  return { ...totals, outstanding: totals.confirmed - totals.paid, byStatus: rows, issues };
}

export async function getEnterpriseReport(user: SessionUser, days = 30) {
  const reportPermissions = await permissionSnapshot(user, [
    PORTAL_PERMISSION.REPORT_SALES,
    PORTAL_PERMISSION.REPORT_FINANCE,
  ] as const);
  if (!reportPermissions[PORTAL_PERMISSION.REPORT_SALES] && !reportPermissions[PORTAL_PERMISSION.REPORT_FINANCE]) {
    const error = new Error("Keine Berechtigung für Reporting.");
    Object.assign(error, { status: 403 });
    throw error;
  }

  const boundedDays = Math.max(1, Math.min(days, 365));
  const now = new Date();
  const operationsPolicy = await getOperationsPolicy();
  const policyCutoffs = operationsPolicyCutoffs(operationsPolicy, now);
  const reportAttentionCondition = sql`${orders.status} not in ('active','rejected','cancelled','storno')
    and (
      (${orders.status} = 'documents_missing' and ${orders.updatedAt} < ${policyCutoffs.documentsStaleAt})
      or ${orders.updatedAt} < ${policyCutoffs.orderStaleAt}
    )`;
  const reportProviderWarningCondition = sql`${orders.status} not in ('draft','active','rejected','cancelled','storno')
    and (
      (${orders.externalOrderId} is null and ${orders.submittedAt} is not null and ${orders.submittedAt} < ${policyCutoffs.providerReferenceMissingAt})
      or (${orders.providerStatus} is null and ${orders.submittedAt} is not null and ${orders.submittedAt} < ${policyCutoffs.providerStatusMissingAt})
      or (${orders.status} = 'activation_pending' and ${orders.updatedAt} < ${policyCutoffs.activationStaleAt})
      or (${orders.status} = 'documents_missing' and ${orders.updatedAt} < ${policyCutoffs.documentsStaleAt})
    )`;
  const periodMs = boundedDays * 24 * 60 * 60_000;
  const from = new Date(now.getTime() - periodMs);
  const previousFrom = new Date(from.getTime() - periodMs);
  const orderScope = orderAccess(user);
  const leadScope = leadAccessCondition(user);
  const orderCondition = and(orderScope, gte(orders.createdAt, from), lte(orders.createdAt, now));
  const previousOrderCondition = and(orderScope, gte(orders.createdAt, previousFrom), lt(orders.createdAt, from));
  const leadCondition = and(leadScope, gte(leads.createdAt, from), lte(leads.createdAt, now));
  const previousLeadCondition = and(leadScope, gte(leads.createdAt, previousFrom), lt(leads.createdAt, from));

  const [
    orderRows,
    providerRows,
    cycleRows,
    taskRows,
    leadRows,
    previousOrderRows,
    previousLeadRows,
    activationEventRows,
    previousActivationEventRows,
    pipelineSnapshotRows,
    leadPipelineSnapshotRows,
    missingExternalRows,
    staleLeadRows,
    reconciliationRows,
    incompleteProductRows,
    expiringTrainingRows,
    attributionSourceRows,
    attributionCampaignRows,
    leadCoverageRows,
    providerReferenceRows,
    customerOwnerRows,
    taskCoverageRows,
  ] = await Promise.all([
    db.select({
      status: orders.status,
      count: sql<number>`count(*)::int`,
      expected: sql<string>`coalesce(sum(${orders.expectedCommission}),0)::text`,
    }).from(orders).where(orderCondition).groupBy(orders.status),
    db.select({
      provider: providers.name,
      count: sql<number>`count(*)::int`,
      expected: sql<string>`coalesce(sum(${orders.expectedCommission}),0)::text`,
      active: sql<number>`count(*) filter (where ${orders.status}='active')::int`,
      cancelled: sql<number>`count(*) filter (where ${orders.status} in ('cancelled','storno'))::int`,
    }).from(orders)
      .innerJoin(providers, eq(orders.providerId, providers.id))
      .where(orderCondition)
      .groupBy(providers.name)
      .orderBy(desc(sql`count(*)`))
      .limit(12),
    db.select({
      averageHours: sql<number>`coalesce(avg(extract(epoch from (${orders.activatedAt} - ${orders.createdAt})) / 3600),0)::float`,
    }).from(orders).where(and(orderCondition, eq(orders.status, "active"))),
    db.select({
      open: sql<number>`count(*) filter (where ${tasks.status} in ('open','in_progress'))::int`,
      overdue: sql<number>`count(*) filter (
        where ${tasks.status} in ('open','in_progress') and ${tasks.dueAt} is not null and ${tasks.dueAt} < now()
      )::int`,
    }).from(tasks).where(taskAccess(user)),
    db.select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${leads.status}='abgeschlossen')::int`,
      lost: sql<number>`count(*) filter (where ${leads.status}='verloren')::int`,
    }).from(leads).where(leadCondition),
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${orders.status}='active')::int`,
    }).from(orders).where(previousOrderCondition),
    db.select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${leads.status}='abgeschlossen')::int`,
    }).from(leads).where(previousLeadCondition),
    db.select({
      count: sql<number>`count(*)::int`,
    }).from(orders).where(and(
      orderScope,
      gte(orders.activatedAt, from),
      lte(orders.activatedAt, now),
    )),
    db.select({
      count: sql<number>`count(*)::int`,
    }).from(orders).where(and(
      orderScope,
      gte(orders.activatedAt, previousFrom),
      lt(orders.activatedAt, from),
    )),
    db.select({
      preparation: sql<number>`count(*) filter (where ${orders.status} in ('draft','documents_missing','ready_to_submit'))::int`,
      submitted: sql<number>`count(*) filter (where ${orders.status} in ('submitted','provider_review'))::int`,
      committed: sql<number>`count(*) filter (where ${orders.status} in ('accepted','activation_pending'))::int`,
      blocked: sql<number>`count(*) filter (where ${reportAttentionCondition})::int`,
      providerWarnings: sql<number>`count(*) filter (where ${reportProviderWarningCondition})::int`,
      openExpectedCommission: sql<string>`coalesce(sum(${orders.expectedCommission}) filter (
        where ${orders.status} not in ('active','rejected','cancelled','storno')
      ), 0)::text`,
    }).from(orders).where(orderScope),
    db.select({
      open: sql<number>`count(*) filter (where ${leads.status} not in ('abgeschlossen','verloren'))::int`,
      qualified: sql<number>`count(*) filter (where ${leads.status} in ('termin_bestaetigt','in_beratung'))::int`,
      hot: sql<number>`count(*) filter (
        where ${leads.priority} in ('high','hot') and ${leads.status} not in ('abgeschlossen','verloren')
      )::int`,
    }).from(leads).where(leadScope),
    db.select({ count: sql<number>`count(*)::int` }).from(orders).where(and(
      orderScope,
      isNull(orders.externalOrderId),
      inArray(orders.status, ["submitted", "provider_review", "accepted", "activation_pending", "active"]),
    )),
    db.select({ count: sql<number>`count(*)::int` }).from(leads).where(and(
      leadScope,
      inArray(leads.status, ["neu", "kontaktiert"]),
      lte(leads.createdAt, policyCutoffs.leadHighAt),
    )),
    user.role === "admin"
      ? db.select({ count: sql<number>`count(*)::int` }).from(reconciliationIssues).where(eq(reconciliationIssues.status, "open"))
      : Promise.resolve([{ count: 0 }]),
    user.role === "admin"
      ? db.select({ count: sql<number>`count(*)::int` }).from(products)
          .leftJoin(productCatalogProfiles, eq(productCatalogProfiles.productId, products.id))
          .where(and(
            eq(products.active, true),
            or(
              isNull(productCatalogProfiles.productId),
              eq(productCatalogProfiles.description, ""),
              eq(productCatalogProfiles.completionProcess, ""),
              sql`coalesce(jsonb_array_length(${productCatalogProfiles.salesArguments}), 0) = 0`,
            ),
          ))
      : Promise.resolve([{ count: 0 }]),
    db.select({ count: sql<number>`count(*)::int` }).from(employeeTrainingCompletions).where(and(
      eq(employeeTrainingCompletions.status, "completed"),
      user.role === "admin" ? sql`true` : eq(employeeTrainingCompletions.employeeId, user.id),
      gte(employeeTrainingCompletions.expiresAt, now),
      lte(employeeTrainingCompletions.expiresAt, new Date(now.getTime() + 30 * 24 * 60 * 60_000)),
    )),
    db.select({
      source: sql<string>`coalesce(
        nullif(${leads.meta}->>'utmSource',''),
        nullif(${leads.meta}->>'referrerHost',''),
        nullif(${leads.source},''),
        'Direkt / unbekannt'
      )`,
      total: sql<number>`count(*)::int`,
      qualified: sql<number>`count(*) filter (where ${leads.status} in ('termin_bestaetigt','in_beratung','abgeschlossen'))::int`,
      completed: sql<number>`count(*) filter (where ${leads.status}='abgeschlossen')::int`,
      business: sql<number>`count(*) filter (where ${leads.meta}->>'audience'='b2b')::int`,
    }).from(leads)
      .where(leadCondition)
      .groupBy(sql`coalesce(nullif(${leads.meta}->>'utmSource',''), nullif(${leads.meta}->>'referrerHost',''), nullif(${leads.source},''), 'Direkt / unbekannt')`)
      .orderBy(desc(sql`count(*)`))
      .limit(20),
    db.select({
      campaign: sql<string>`coalesce(
        nullif(${leads.meta}->>'utmCampaign',''),
        case when ${leads.source} like 'campaign:%' or ${leads.source} like 'kampagne:%' then ${leads.source} else null end,
        'Ohne Kampagne'
      )`,
      total: sql<number>`count(*)::int`,
      qualified: sql<number>`count(*) filter (where ${leads.status} in ('termin_bestaetigt','in_beratung','abgeschlossen'))::int`,
      completed: sql<number>`count(*) filter (where ${leads.status}='abgeschlossen')::int`,
      lost: sql<number>`count(*) filter (where ${leads.status}='verloren')::int`,
    }).from(leads)
      .where(leadCondition)
      .groupBy(sql`coalesce(nullif(${leads.meta}->>'utmCampaign',''), case when ${leads.source} like 'campaign:%' or ${leads.source} like 'kampagne:%' then ${leads.source} else null end, 'Ohne Kampagne')`)
      .orderBy(desc(sql`count(*)`))
      .limit(20),
    db.select({
      total: sql<number>`count(*) filter (where ${leads.status} not in ('abgeschlossen','verloren'))::int`,
      nextActionCovered: sql<number>`count(*) filter (
        where ${leads.status} not in ('abgeschlossen','verloren')
          and (${leads.nextActionAt} is not null or ${leads.status} = 'termin_bestaetigt')
      )::int`,
      productCovered: sql<number>`count(*) filter (
        where ${leads.status} not in ('abgeschlossen','verloren')
          and exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id})
      )::int`,
    }).from(leads).where(leadScope),
    db.select({
      total: sql<number>`count(*) filter (
        where ${orders.status} in ('submitted','provider_review','accepted','activation_pending','active')
      )::int`,
      covered: sql<number>`count(*) filter (
        where ${orders.status} in ('submitted','provider_review','accepted','activation_pending','active')
          and nullif(trim(${orders.externalOrderId}), '') is not null
      )::int`,
    }).from(orders).where(orderScope),
    db.select({
      total: sql<number>`count(*)::int`,
      covered: sql<number>`count(*) filter (where ${customers.ownerEmployeeId} is not null)::int`,
    }).from(customers).where(and(customerAccess(user), isNull(customers.archivedAt))),
    db.select({
      total: sql<number>`count(*) filter (where ${tasks.status} in ('open','in_progress'))::int`,
      covered: sql<number>`count(*) filter (
        where ${tasks.status} in ('open','in_progress')
          and (${tasks.dueAt} is null or ${tasks.dueAt} >= ${now})
      )::int`,
    }).from(tasks).where(taskAccess(user)),
  ]);

  const total = orderRows.reduce((sum, row) => sum + row.count, 0);
  const active = orderRows.find((row) => row.status === "active")?.count ?? 0;
  const cancelled = orderRows.filter((row) => ["cancelled", "storno"].includes(row.status)).reduce((sum, row) => sum + row.count, 0);
  const leadTotal = leadRows[0]?.total ?? 0;
  const leadCompleted = leadRows[0]?.completed ?? 0;
  const previousOrders = previousOrderRows[0]?.total ?? 0;
  const previousLeads = previousLeadRows[0]?.total ?? 0;
  const activationsInPeriod = activationEventRows[0]?.count ?? 0;
  const previousActivations = previousActivationEventRows[0]?.count ?? 0;
  const pipeline = pipelineSnapshotRows[0] ?? {
    preparation: 0,
    submitted: 0,
    committed: 0,
    blocked: 0,
    providerWarnings: 0,
    openExpectedCommission: "0",
  };
  const leadPipeline = leadPipelineSnapshotRows[0] ?? { open: 0, qualified: 0, hot: 0 };
  const openOrderPipeline = pipeline.preparation + pipeline.submitted + pipeline.committed;
  const activationThroughputPerDay = Math.round((activationsInPeriod / boundedDays) * 100) / 100;
  const previousActivationThroughputPerDay = Math.round((previousActivations / boundedDays) * 100) / 100;
  const runRateScenario30 = Math.round(activationThroughputPerDay * 30 * 10) / 10;
  const backlogDays = activationThroughputPerDay > 0
    ? Math.round((openOrderPipeline / activationThroughputPerDay) * 10) / 10
    : null;
  const committedCoveragePercent = runRateScenario30 > 0
    ? Math.round((pipeline.committed / runRateScenario30) * 1000) / 10
    : null;

  const change = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  };

  let teamCapacity: Array<{
    employeeId: number;
    name: string;
    openLeads: number;
    openTasks: number;
    overdueTasks: number;
    openOrders: number;
    blockedOrders: number;
    activations: number;
  }> = [];

  if (user.role === "admin") {
    const [staff, leadLoad, taskLoad, orderLoad] = await Promise.all([
      db.select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(eq(employees.active, true))
        .orderBy(employees.name),
      db.select({
        employeeId: leads.assignedEmployeeId,
        openLeads: sql<number>`count(*) filter (
          where ${leads.status} not in ('abgeschlossen','verloren')
        )::int`,
      }).from(leads)
        .where(sql`${leads.assignedEmployeeId} is not null`)
        .groupBy(leads.assignedEmployeeId),
      db.select({
        employeeId: tasks.assignedToEmployeeId,
        openTasks: sql<number>`count(*) filter (
          where ${tasks.status} in ('open','in_progress')
        )::int`,
        overdueTasks: sql<number>`count(*) filter (
          where ${tasks.status} in ('open','in_progress')
            and ${tasks.dueAt} is not null
            and ${tasks.dueAt} < ${now}
        )::int`,
      }).from(tasks)
        .where(sql`${tasks.assignedToEmployeeId} is not null`)
        .groupBy(tasks.assignedToEmployeeId),
      db.select({
        employeeId: orders.advisorEmployeeId,
        openOrders: sql<number>`count(*) filter (
          where ${orders.status} not in ('active','rejected','cancelled','storno')
        )::int`,
        blockedOrders: sql<number>`count(*) filter (where ${reportAttentionCondition})::int`,
        activations: sql<number>`count(*) filter (
          where ${orders.activatedAt} >= ${from} and ${orders.activatedAt} <= ${now}
        )::int`,
      }).from(orders)
        .where(sql`${orders.advisorEmployeeId} is not null`)
        .groupBy(orders.advisorEmployeeId),
    ]);

    teamCapacity = staff.map((person) => {
      const lead = leadLoad.find((row) => row.employeeId === person.id);
      const task = taskLoad.find((row) => row.employeeId === person.id);
      const order = orderLoad.find((row) => row.employeeId === person.id);
      return {
        employeeId: person.id,
        name: person.name,
        openLeads: lead?.openLeads ?? 0,
        openTasks: task?.openTasks ?? 0,
        overdueTasks: task?.overdueTasks ?? 0,
        openOrders: order?.openOrders ?? 0,
        blockedOrders: order?.blockedOrders ?? 0,
        activations: order?.activations ?? 0,
      };
    });
  }

  return {
    days: boundedDays,
    totalOrders: total,
    activeOrders: active,
    cancellationRate: total ? Math.round((cancelled / total) * 1000) / 10 : 0,
    activationRate: total ? Math.round((active / total) * 1000) / 10 : 0,
    expectedCommission: orderRows.reduce((sum, row) => sum + Number(row.expected), 0),
    averageCycleHours: Math.round((cycleRows[0]?.averageHours ?? 0) * 10) / 10,
    openTasks: taskRows[0]?.open ?? 0,
    overdueTasks: taskRows[0]?.overdue ?? 0,
    leadTotal,
    leadCompleted,
    leadLost: leadRows[0]?.lost ?? 0,
    leadConversionRate: leadTotal ? Math.round((leadCompleted / leadTotal) * 1000) / 10 : 0,
    trends: {
      orders: change(total, previousOrders),
      leads: change(leadTotal, previousLeads),
      activations: change(activationsInPeriod, previousActivations),
      leadWins: change(leadCompleted, previousLeadRows[0]?.completed ?? 0),
    },
    operationsPolicy: {
      leadNextActionHighHours: operationsPolicy.leadNextActionHighHours,
      orderStaleDays: operationsPolicy.orderStaleDays,
      providerReferenceMissingHours: operationsPolicy.providerReferenceMissingHours,
      providerStatusMissingHours: operationsPolicy.providerStatusMissingHours,
      activationStaleDays: operationsPolicy.activationStaleDays,
      documentsStaleHours: operationsPolicy.documentsStaleHours,
    },
    dataQuality: {
      staleLeadsSla: staleLeadRows[0]?.count ?? 0,
      ordersMissingExternalId: missingExternalRows[0]?.count ?? 0,
      openReconciliation: reconciliationRows[0]?.count ?? 0,
      incompleteProducts: incompleteProductRows[0]?.count ?? 0,
      expiringTrainings30d: expiringTrainingRows[0]?.count ?? 0,
    },
    qualityCoverage: {
      nextAction: {
        covered: leadCoverageRows[0]?.nextActionCovered ?? 0,
        total: leadCoverageRows[0]?.total ?? 0,
        percent: percentage(leadCoverageRows[0]?.nextActionCovered ?? 0, leadCoverageRows[0]?.total ?? 0),
      },
      productContext: {
        covered: leadCoverageRows[0]?.productCovered ?? 0,
        total: leadCoverageRows[0]?.total ?? 0,
        percent: percentage(leadCoverageRows[0]?.productCovered ?? 0, leadCoverageRows[0]?.total ?? 0),
      },
      providerReference: {
        covered: providerReferenceRows[0]?.covered ?? 0,
        total: providerReferenceRows[0]?.total ?? 0,
        percent: percentage(providerReferenceRows[0]?.covered ?? 0, providerReferenceRows[0]?.total ?? 0),
      },
      customerOwner: {
        covered: customerOwnerRows[0]?.covered ?? 0,
        total: customerOwnerRows[0]?.total ?? 0,
        percent: percentage(customerOwnerRows[0]?.covered ?? 0, customerOwnerRows[0]?.total ?? 0),
      },
      taskOnTime: {
        covered: taskCoverageRows[0]?.covered ?? 0,
        total: taskCoverageRows[0]?.total ?? 0,
        percent: percentage(taskCoverageRows[0]?.covered ?? 0, taskCoverageRows[0]?.total ?? 0),
      },
    },
    velocity: {
      leadsPerDay: Math.round((leadTotal / boundedDays) * 100) / 100,
      ordersPerDay: Math.round((total / boundedDays) * 100) / 100,
      activationsPerDay: activationThroughputPerDay,
      previousLeadsPerDay: Math.round((previousLeads / boundedDays) * 100) / 100,
      previousOrdersPerDay: Math.round((previousOrders / boundedDays) * 100) / 100,
      previousActivationsPerDay: previousActivationThroughputPerDay,
    },
    leadership: {
      leadPipeline: {
        open: leadPipeline.open,
        qualified: leadPipeline.qualified,
        hot: leadPipeline.hot,
      },
      orderPipeline: {
        preparation: pipeline.preparation,
        submitted: pipeline.submitted,
        committed: pipeline.committed,
        open: openOrderPipeline,
        blocked: pipeline.blocked,
        providerWarnings: pipeline.providerWarnings,
        openExpectedCommission: isCompensationOwner(user) ? Number(pipeline.openExpectedCommission) : 0,
      },
      throughput: {
        activationsInPeriod,
        previousActivations,
        activationsPerDay: activationThroughputPerDay,
        previousActivationsPerDay: previousActivationThroughputPerDay,
        runRateScenario30,
        backlogDays,
        committedCoveragePercent,
      },
      methodology: "30-Tage-Szenario = tatsächliche Aktivierungen im gewählten Zeitraum / Tage × 30. Keine Garantie oder ML-Prognose.",
      teamCapacity,
    },
    attribution: {
      bySource: attributionSourceRows.map((row) => ({
        ...row,
        conversionRate: row.total ? Math.round((row.completed / row.total) * 1000) / 10 : 0,
        qualificationRate: row.total ? Math.round((row.qualified / row.total) * 1000) / 10 : 0,
      })),
      byCampaign: attributionCampaignRows.map((row) => ({
        ...row,
        conversionRate: row.total ? Math.round((row.completed / row.total) * 1000) / 10 : 0,
        qualificationRate: row.total ? Math.round((row.qualified / row.total) * 1000) / 10 : 0,
      })),
    },
    byStatus: orderRows,
    byProvider: providerRows,
  };
}

export async function listAuditEvents(limit = 100, filter?: {
  page?: number;
  lookahead?: boolean;
  q?: string;
  entityType?: string;
}) {
  const page = Number.isSafeInteger(filter?.page) && Number(filter?.page) > 0 ? Number(filter?.page) : 1;
  const pageSize = Math.max(1, Math.min(limit, 500));
  const queryLimit = Math.min(pageSize + (filter?.lookahead ? 1 : 0), 500);
  const offset = (page - 1) * pageSize;
  const conditions: SQL[] = [];
  const q = filter?.q?.trim().slice(0, 120);
  const entityType = filter?.entityType?.trim().slice(0, 60);
  if (q) {
    conditions.push(or(
      ilike(auditEvents.action, `%${q}%`),
      ilike(auditEvents.entityType, `%${q}%`),
      ilike(auditEvents.entityId, `%${q}%`),
      ilike(employees.name, `%${q}%`),
    )!);
  }
  if (entityType) conditions.push(eq(auditEvents.entityType, entityType));

  return db.select({
    event: auditEvents,
    actorName: employees.name,
  }).from(auditEvents)
    .leftJoin(employees, eq(auditEvents.actorEmployeeId, employees.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
    .limit(queryLimit)
    .offset(offset);
}

export async function listAutomations() {
  return db.select().from(automationRules).orderBy(desc(automationRules.updatedAt));
}
