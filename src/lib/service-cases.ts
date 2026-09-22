import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import {
  customers,
  notificationQueue,
  orders,
  serviceCaseEvents,
  serviceCases,
  tasks,
} from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";
import { getServiceAssignableEmployee } from "@/lib/enterprise-access";
import { writeAudit } from "@/lib/enterprise";
import { getOperationsPolicy } from "@/lib/operations-policy";
import { serviceCaseDueAt } from "@/lib/operations-policy-shared";

export const SERVICE_CASE_TYPES = ["general", "complaint", "provider_issue", "billing", "cancellation", "documents", "technical"] as const;
export const SERVICE_CASE_STATUSES = ["open", "in_progress", "waiting_customer", "waiting_provider", "resolved", "closed"] as const;
export const SERVICE_CASE_PRIORITIES = ["low", "normal", "high", "critical"] as const;

export type ServiceCaseType = (typeof SERVICE_CASE_TYPES)[number];
export type ServiceCaseStatus = (typeof SERVICE_CASE_STATUSES)[number];
export type ServiceCasePriority = (typeof SERVICE_CASE_PRIORITIES)[number];

export const SERVICE_CASE_TYPE_LABELS: Record<ServiceCaseType, string> = {
  general: "Allgemeiner Service",
  complaint: "Reklamation / Beschwerde",
  provider_issue: "Providerfall",
  billing: "Abrechnung",
  cancellation: "Kündigung / Retention",
  documents: "Unterlagen",
  technical: "Technischer Fall",
};

export const SERVICE_CASE_STATUS_LABELS: Record<ServiceCaseStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  waiting_customer: "Wartet auf Kunde",
  waiting_provider: "Wartet auf Provider",
  resolved: "Gelöst",
  closed: "Geschlossen",
};

export const SERVICE_CASE_PRIORITY_LABELS: Record<ServiceCasePriority, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  critical: "Kritisch",
};

const ACTIVE_STATUSES: ServiceCaseStatus[] = ["open", "in_progress", "waiting_customer", "waiting_provider"];

function serviceCaseReadAccess(user: SessionUser, canAssign: boolean) {
  return user.role === "admin" || canAssign
    ? sql`true`
    : or(
        eq(serviceCases.ownerEmployeeId, user.id),
        eq(customers.ownerEmployeeId, user.id),
      )!;
}

function serviceCaseEditAccess(user: SessionUser, canAssign: boolean) {
  return user.role === "admin" || canAssign ? sql`true` : eq(serviceCases.ownerEmployeeId, user.id);
}

function customerLabelSql() {
  return sql<string>`coalesce(nullif(${customers.companyName}, ''), nullif(trim(concat_ws(' ', ${customers.firstName}, ${customers.lastName})), ''), ${customers.customerNumber})`;
}

export async function listServiceCases(
  user: SessionUser,
  filters: {
    status?: ServiceCaseStatus | "active" | "all";
    priority?: ServiceCasePriority;
    type?: ServiceCaseType;
    focus?: "overdue" | "today" | "critical" | "waiting_provider" | "unassigned";
    ownerId?: number;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
  canAssign = false,
) {
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const pageSize = Math.max(1, Math.min(filters.pageSize ?? 40, 100));
  const q = filters.q?.trim().slice(0, 160) || undefined;
  const conditions = [serviceCaseReadAccess(user, canAssign)];

  if (filters.status && filters.status !== "all") {
    conditions.push(filters.status === "active"
      ? inArray(serviceCases.status, ACTIVE_STATUSES)
      : eq(serviceCases.status, filters.status));
  } else if (!filters.status) {
    conditions.push(inArray(serviceCases.status, ACTIVE_STATUSES));
  }
  if (filters.priority) conditions.push(eq(serviceCases.priority, filters.priority));
  if (filters.type) conditions.push(eq(serviceCases.type, filters.type));
  if (filters.ownerId && canAssign) conditions.push(eq(serviceCases.ownerEmployeeId, filters.ownerId));
  if (filters.focus === "overdue") {
    conditions.push(inArray(serviceCases.status, ACTIVE_STATUSES), sql`${serviceCases.dueAt} < now()`);
  } else if (filters.focus === "today") {
    conditions.push(
      inArray(serviceCases.status, ACTIVE_STATUSES),
      sql`${serviceCases.dueAt} >= (date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin')`,
      sql`${serviceCases.dueAt} < ((date_trunc('day', now() at time zone 'Europe/Berlin') + interval '1 day') at time zone 'Europe/Berlin')`,
    );
  } else if (filters.focus === "critical") {
    conditions.push(inArray(serviceCases.status, ACTIVE_STATUSES), eq(serviceCases.priority, "critical"));
  } else if (filters.focus === "waiting_provider") {
    conditions.push(eq(serviceCases.status, "waiting_provider"));
  } else if (filters.focus === "unassigned" && canAssign) {
    conditions.push(sql`${serviceCases.ownerEmployeeId} is null`);
  }
  if (q) {
    conditions.push(or(
      ilike(serviceCases.caseNumber, `%${q}%`),
      ilike(serviceCases.subject, `%${q}%`),
      ilike(serviceCases.description, `%${q}%`),
      ilike(customers.customerNumber, `%${q}%`),
      ilike(customers.companyName, `%${q}%`),
      ilike(customers.firstName, `%${q}%`),
      ilike(customers.lastName, `%${q}%`),
      ilike(orders.externalOrderId, `%${q}%`),
    )!);
  }

  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    db.select({
      serviceCase: serviceCases,
      customerNumber: customers.customerNumber,
      customerName: customerLabelSql(),
      orderExternalId: orders.externalOrderId,
      orderStatus: orders.status,
      ownerName: employees.name,
    })
      .from(serviceCases)
      .innerJoin(customers, eq(serviceCases.customerId, customers.id))
      .leftJoin(orders, eq(serviceCases.orderId, orders.id))
      .leftJoin(employees, eq(serviceCases.ownerEmployeeId, employees.id))
      .where(where)
      .orderBy(
        sql`case ${serviceCases.priority} when 'critical' then 0 when 'high' then 1 when 'normal' then 2 else 3 end`,
        serviceCases.dueAt,
        desc(serviceCases.lastActivityAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` })
      .from(serviceCases)
      .innerJoin(customers, eq(serviceCases.customerId, customers.id))
      .leftJoin(orders, eq(serviceCases.orderId, orders.id))
      .where(where),
  ]);

  const total = totals[0]?.count ?? 0;
  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getServiceCaseSummary(user: SessionUser, canAssign = false) {
  const [row] = await db.select({
    active: sql<number>`count(*) filter (where ${serviceCases.status} in ('open','in_progress','waiting_customer','waiting_provider'))::int`,
    overdue: sql<number>`count(*) filter (where ${serviceCases.status} in ('open','in_progress','waiting_customer','waiting_provider') and ${serviceCases.dueAt} < now())::int`,
    critical: sql<number>`count(*) filter (where ${serviceCases.status} in ('open','in_progress','waiting_customer','waiting_provider') and ${serviceCases.priority} = 'critical')::int`,
    waitingProvider: sql<number>`count(*) filter (where ${serviceCases.status} = 'waiting_provider')::int`,
    unassigned: sql<number>`count(*) filter (where ${serviceCases.status} in ('open','in_progress','waiting_customer','waiting_provider') and ${serviceCases.ownerEmployeeId} is null)::int`,
  }).from(serviceCases)
    .innerJoin(customers, eq(serviceCases.customerId, customers.id))
    .where(serviceCaseReadAccess(user, canAssign));
  return {
    active: row?.active ?? 0,
    overdue: row?.overdue ?? 0,
    critical: row?.critical ?? 0,
    waitingProvider: row?.waitingProvider ?? 0,
    unassigned: canAssign ? row?.unassigned ?? 0 : 0,
  };
}

export async function getServiceCase(id: number, user: SessionUser, canAssign = false) {
  const [row] = await db.select({
    serviceCase: serviceCases,
    customerNumber: customers.customerNumber,
    customerName: customerLabelSql(),
    customerPhone: customers.phone,
    customerEmail: customers.email,
    orderExternalId: orders.externalOrderId,
    orderStatus: orders.status,
    ownerName: employees.name,
  })
    .from(serviceCases)
    .innerJoin(customers, eq(serviceCases.customerId, customers.id))
    .leftJoin(orders, eq(serviceCases.orderId, orders.id))
    .leftJoin(employees, eq(serviceCases.ownerEmployeeId, employees.id))
    .where(and(eq(serviceCases.id, id), serviceCaseReadAccess(user, canAssign)))
    .limit(1);
  if (!row) return null;

  const events = await db.select({
    event: serviceCaseEvents,
    actorName: employees.name,
  }).from(serviceCaseEvents)
    .leftJoin(employees, eq(serviceCaseEvents.actorEmployeeId, employees.id))
    .where(eq(serviceCaseEvents.serviceCaseId, id))
    .orderBy(desc(serviceCaseEvents.createdAt), desc(serviceCaseEvents.id))
    .limit(250);

  return { ...row, events };
}

export async function listServiceCaseCustomerOptions(user: SessionUser, canAssign = false, limit = 250) {
  const condition = user.role === "admin" || canAssign
    ? sql`true`
    : eq(customers.ownerEmployeeId, user.id);
  return db.select({
    id: customers.id,
    customerNumber: customers.customerNumber,
    name: customerLabelSql(),
  }).from(customers)
    .where(condition)
    .orderBy(desc(customers.updatedAt), desc(customers.id))
    .limit(Math.max(1, Math.min(limit, 500)));
}

export async function listServiceCaseOrderOptions(user: SessionUser, canAssign = false, limit = 400) {
  const condition = user.role === "admin" || canAssign
    ? sql`true`
    : eq(orders.advisorEmployeeId, user.id);
  return db.select({
    id: orders.id,
    customerId: orders.customerId,
    externalOrderId: orders.externalOrderId,
    status: orders.status,
  }).from(orders)
    .where(condition)
    .orderBy(desc(orders.updatedAt), desc(orders.id))
    .limit(Math.max(1, Math.min(limit, 800)));
}

type CreateServiceCaseInput = {
  customerId: number;
  orderId?: number | null;
  ownerEmployeeId?: number;
  type: ServiceCaseType;
  priority: ServiceCasePriority;
  subject: string;
  description: string;
};

export async function createServiceCase(
  user: SessionUser,
  input: CreateServiceCaseInput,
  canAssign: boolean,
) {
  const customerCondition = user.role === "admin" || canAssign
    ? eq(customers.id, input.customerId)
    : and(eq(customers.id, input.customerId), eq(customers.ownerEmployeeId, user.id));
  const [customer] = await db.select({ id: customers.id }).from(customers).where(customerCondition).limit(1);
  if (!customer) throw Object.assign(new Error("Kunde nicht gefunden oder keine Berechtigung."), { status: 404 });

  if (input.orderId) {
    const orderCondition = user.role === "admin" || canAssign
      ? and(eq(orders.id, input.orderId), eq(orders.customerId, input.customerId))
      : and(eq(orders.id, input.orderId), eq(orders.customerId, input.customerId), eq(orders.advisorEmployeeId, user.id));
    const [order] = await db.select({ id: orders.id }).from(orders).where(orderCondition).limit(1);
    if (!order) throw Object.assign(new Error("Auftrag passt nicht zum Kunden oder ist nicht zugänglich."), { status: 422 });
  }

  let ownerEmployeeId = user.id;
  if (input.ownerEmployeeId && input.ownerEmployeeId !== user.id) {
    if (!canAssign && user.role !== "admin") throw Object.assign(new Error("Keine Berechtigung für diese Zuweisung."), { status: 403 });
    const target = await getServiceAssignableEmployee(input.ownerEmployeeId);
    if (!target) throw Object.assign(new Error("Zielmitarbeiter ist nicht für Servicefälle freigeschaltet."), { status: 422 });
    ownerEmployeeId = target.id;
  }

  const policy = await getOperationsPolicy();
  const now = new Date();
  const dueAt = serviceCaseDueAt(policy, input.priority, now);
  const caseNumber = `SC-${now.getUTCFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;

  return db.transaction(async (tx) => {
    const [created] = await tx.insert(serviceCases).values({
      caseNumber,
      customerId: input.customerId,
      orderId: input.orderId ?? null,
      ownerEmployeeId,
      createdByEmployeeId: user.id,
      type: input.type,
      status: "open",
      priority: input.priority,
      subject: input.subject,
      description: input.description,
      dueAt,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    }).returning();

    await tx.insert(serviceCaseEvents).values({
      serviceCaseId: created.id,
      actorEmployeeId: user.id,
      type: "created",
      toValue: "open",
      note: input.description || null,
      createdAt: now,
    });

    await tx.insert(tasks).values({
      entityType: "service_case",
      entityId: created.id,
      assignedToEmployeeId: ownerEmployeeId,
      createdByEmployeeId: user.id,
      type: "service_case",
      title: `Servicefall ${caseNumber}: ${input.subject}`,
      description: input.description || null,
      priority: input.priority,
      status: "open",
      dueAt,
      createdAt: now,
      updatedAt: now,
    });

    if (input.priority === "high" || input.priority === "critical") {
      await tx.insert(notificationQueue).values({
        employeeId: ownerEmployeeId,
        channel: "in_app",
        category: "service",
        priority: input.priority,
        subject: `${input.priority === "critical" ? "Kritischer" : "Priorisierter"} Servicefall ${caseNumber}`,
        body: input.subject,
        entityType: "service_case",
        entityId: String(created.id),
        actionUrl: `/portal/service/${created.id}`,
        metadata: { customerId: input.customerId, orderId: input.orderId ?? null },
      });
    }

    await writeAudit(tx, user.id, "service_case.created", "service_case", String(created.id), undefined, {
      caseNumber,
      customerId: input.customerId,
      orderId: input.orderId ?? null,
      ownerEmployeeId,
      type: input.type,
      priority: input.priority,
      dueAt: dueAt.toISOString(),
    });
    return created;
  });
}

type UpdateServiceCaseInput = {
  status?: ServiceCaseStatus;
  priority?: ServiceCasePriority;
  ownerEmployeeId?: number | null;
  note?: string;
  resolution?: string;
};

export async function updateServiceCase(
  user: SessionUser,
  id: number,
  input: UpdateServiceCaseInput,
  canAssign: boolean,
) {
  const [current] = await db.select().from(serviceCases)
    .where(and(eq(serviceCases.id, id), serviceCaseEditAccess(user, canAssign)))
    .limit(1);
  if (!current) throw Object.assign(new Error("Servicefall nicht gefunden oder keine Bearbeitungsberechtigung."), { status: 404 });

  let nextOwner = current.ownerEmployeeId;
  if (input.ownerEmployeeId !== undefined && input.ownerEmployeeId !== current.ownerEmployeeId) {
    if (!canAssign && user.role !== "admin") throw Object.assign(new Error("Keine Berechtigung für diese Zuweisung."), { status: 403 });
    if (input.ownerEmployeeId !== null) {
      const target = await getServiceAssignableEmployee(input.ownerEmployeeId);
      if (!target) throw Object.assign(new Error("Zielmitarbeiter ist nicht für Servicefälle freigeschaltet."), { status: 422 });
      nextOwner = target.id;
    } else {
      nextOwner = null;
    }
  }

  const nextStatus = input.status ?? current.status as ServiceCaseStatus;
  const nextPriority = input.priority ?? current.priority as ServiceCasePriority;
  const isClosing = nextStatus === "resolved" || nextStatus === "closed";
  const resolution = input.resolution?.trim() || current.resolution?.trim() || "";
  if (isClosing && !resolution) {
    throw Object.assign(new Error("Für gelöste oder geschlossene Fälle muss eine Lösung dokumentiert werden."), { status: 422 });
  }

  const note = input.note?.trim() ?? "";
  const suppliedResolution = input.resolution?.trim() ?? "";
  const ownerChanged = nextOwner !== current.ownerEmployeeId;
  const statusChanged = nextStatus !== current.status;
  const priorityChanged = nextPriority !== current.priority;
  const resolutionChanged = suppliedResolution !== "" && suppliedResolution !== (current.resolution ?? "");
  const reopened = ["resolved", "closed"].includes(current.status) && ACTIVE_STATUSES.includes(nextStatus);
  if (!ownerChanged && !statusChanged && !priorityChanged && !resolutionChanged && !reopened && !note) return current;

  const now = new Date();
  const policy = priorityChanged ? await getOperationsPolicy() : null;
  const nextDueAt = priorityChanged && policy ? serviceCaseDueAt(policy, nextPriority, now) : current.dueAt;
  const firstResponseAt = current.firstResponseAt ?? (statusChanged || priorityChanged || resolutionChanged || note ? now : null);

  return db.transaction(async (tx) => {
    const patch = {
      status: nextStatus,
      priority: nextPriority,
      ownerEmployeeId: nextOwner,
      dueAt: nextDueAt,
      resolution: isClosing ? resolution : reopened ? null : (input.resolution?.trim() || current.resolution),
      firstResponseAt,
      resolvedAt: nextStatus === "resolved" || nextStatus === "closed" ? current.resolvedAt ?? now : reopened ? null : current.resolvedAt,
      closedAt: nextStatus === "closed" ? current.closedAt ?? now : reopened ? null : current.closedAt,
      lastActivityAt: now,
      updatedAt: now,
    };

    const [updated] = await tx.update(serviceCases).set(patch).where(eq(serviceCases.id, id)).returning();

    const events: Array<typeof serviceCaseEvents.$inferInsert> = [];
    if (statusChanged) events.push({
      serviceCaseId: id, actorEmployeeId: user.id, type: "status_changed",
      fromValue: current.status, toValue: nextStatus, note: input.note?.trim() || null, createdAt: now,
    });
    if (priorityChanged) events.push({
      serviceCaseId: id, actorEmployeeId: user.id, type: "priority_changed",
      fromValue: current.priority, toValue: nextPriority, createdAt: now,
    });
    if (ownerChanged) events.push({
      serviceCaseId: id, actorEmployeeId: user.id, type: "assigned",
      fromValue: current.ownerEmployeeId ? String(current.ownerEmployeeId) : null,
      toValue: nextOwner ? String(nextOwner) : null,
      createdAt: now,
    });
    if (resolutionChanged) events.push({
      serviceCaseId: id, actorEmployeeId: user.id, type: "resolution",
      note: suppliedResolution, createdAt: now,
    });
    if (note && !statusChanged) events.push({
      serviceCaseId: id, actorEmployeeId: user.id, type: "note",
      note, createdAt: now,
    });
    if (events.length) await tx.insert(serviceCaseEvents).values(events);

    const taskPatch = isClosing
      ? {
          assignedToEmployeeId: nextOwner,
          priority: nextPriority,
          dueAt: nextDueAt,
          status: "completed",
          completedAt: now,
          updatedAt: now,
        }
      : {
          assignedToEmployeeId: nextOwner,
          priority: nextPriority,
          dueAt: nextDueAt,
          status: "open",
          completedAt: null,
          updatedAt: now,
        };
    await tx.update(tasks).set(taskPatch).where(and(
      eq(tasks.entityType, "service_case"),
      eq(tasks.entityId, id),
      eq(tasks.type, "service_case"),
    ));

    if (nextOwner && ownerChanged) {
      await tx.insert(notificationQueue).values({
        employeeId: nextOwner,
        channel: "in_app",
        category: "service",
        priority: nextPriority,
        subject: `Servicefall ${current.caseNumber} wurde dir zugewiesen`,
        body: current.subject,
        entityType: "service_case",
        entityId: String(id),
        actionUrl: `/portal/service/${id}`,
        metadata: { previousOwnerEmployeeId: current.ownerEmployeeId },
      });
    }

    await writeAudit(tx, user.id, "service_case.updated", "service_case", String(id), {
      status: current.status,
      priority: current.priority,
      ownerEmployeeId: current.ownerEmployeeId,
      dueAt: current.dueAt.toISOString(),
      resolution: current.resolution,
    }, {
      status: updated.status,
      priority: updated.priority,
      ownerEmployeeId: updated.ownerEmployeeId,
      dueAt: updated.dueAt.toISOString(),
      resolution: updated.resolution,
    });

    return updated;
  });
}
