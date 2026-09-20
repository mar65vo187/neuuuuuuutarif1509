import { and, asc, desc, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees, leads } from "@/db/schema";
import { commissionEvents, customers, orders, tasks } from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";
import { isCompensationOwner } from "@/lib/compensation";
import { leadAccessCondition } from "@/lib/queries";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const orderAccess = (user: SessionUser) => user.role === "admin" ? sql`true` : eq(orders.advisorEmployeeId, user.id);
const taskAccess = (user: SessionUser) => user.role === "admin" ? sql`true` : eq(tasks.assignedToEmployeeId, user.id);
const customerAccess = (user: SessionUser) => user.role === "admin" ? sql`true` : eq(customers.ownerEmployeeId, user.id);

export type FocusItem = {
  key: string;
  kind: "lead" | "task" | "order";
  priority: "critical" | "high" | "normal";
  title: string;
  subtitle: string;
  href: string;
  timestamp: string | null;
};

export type TeamPulseRow = {
  employeeId: number;
  name: string;
  role: string;
  openLeads: number;
  openTasks: number;
  overdueTasks: number;
  activeOrders: number;
  wins30: number;
};

export type CommandCenterData = {
  metrics: {
    openLeads: number;
    newLeads24h: number;
    untouchedLeads24h: number;
    dueTasks24h: number;
    overdueTasks: number;
    activeOrders: number;
    attentionOrders: number;
    customers: number;
    wins30: number;
  };
  leadPipeline: Array<{ status: string; count: number }>;
  orderPipeline: Array<{ status: string; count: number }>;
  leadSeries: Array<{ day: string; label: string; count: number }>;
  focus: FocusItem[];
  team: TeamPulseRow[];
  taskAssignees: Array<{ id: number; name: string }>;
  finance: null | {
    confirmed: number;
    paid: number;
    outstanding: number;
    overdue: number;
  };
};

export async function getCommandCenterData(user: SessionUser): Promise<CommandCenterData> {
  const now = new Date();
  const ago24 = new Date(now.getTime() - DAY);
  const next24 = new Date(now.getTime() + DAY);
  const ago7d = new Date(now.getTime() - 7 * DAY);
  const ago14d = new Date(now.getTime() - 14 * DAY);
  const ago30d = new Date(now.getTime() - 30 * DAY);

  const leadAccess = leadAccessCondition(user);
  const orderCondition = orderAccess(user);
  const taskCondition = taskAccess(user);
  const customerCondition = customerAccess(user);

  const [
    leadMetricsRows,
    taskMetricsRows,
    orderMetricsRows,
    customerRows,
    leadPipeline,
    orderPipeline,
    dailyRows,
    attentionLeads,
    attentionTasks,
    attentionOrders,
  ] = await Promise.all([
    db.select({
      open: sql<number>`count(*) filter (where ${leads.status} in ('neu','kontaktiert','termin_bestaetigt','in_beratung'))::int`,
      new24: sql<number>`count(*) filter (where ${leads.createdAt} >= ${ago24})::int`,
      untouched24: sql<number>`count(*) filter (where ${leads.status} = 'neu' and ${leads.createdAt} < ${ago24})::int`,
      wins30: sql<number>`count(*) filter (where ${leads.status} = 'abgeschlossen' and ${leads.updatedAt} >= ${ago30d})::int`,
    }).from(leads).where(leadAccess),
    db.select({
      due24: sql<number>`count(*) filter (where ${tasks.status} in ('open','in_progress') and ${tasks.dueAt} is not null and ${tasks.dueAt} >= ${now} and ${tasks.dueAt} <= ${next24})::int`,
      overdue: sql<number>`count(*) filter (where ${tasks.status} in ('open','in_progress') and ${tasks.dueAt} is not null and ${tasks.dueAt} < ${now})::int`,
    }).from(tasks).where(taskCondition),
    db.select({
      active: sql<number>`count(*) filter (where ${orders.status} = 'active')::int`,
      attention: sql<number>`count(*) filter (where ${orders.status} not in ('active','rejected','cancelled','storno') and (${orders.status} = 'documents_missing' or ${orders.updatedAt} < ${ago7d}))::int`,
    }).from(orders).where(orderCondition),
    db.select({ count: sql<number>`count(*)::int` }).from(customers).where(and(customerCondition, sql`${customers.archivedAt} is null`)),
    db.select({ status: leads.status, count: sql<number>`count(*)::int` }).from(leads).where(leadAccess).groupBy(leads.status),
    db.select({ status: orders.status, count: sql<number>`count(*)::int` }).from(orders).where(orderCondition).groupBy(orders.status),
    db.select({
      day: sql<string>`to_char(${leads.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    }).from(leads).where(and(leadAccess, gte(leads.createdAt, ago14d)))
      .groupBy(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`),
    db.select({
      id: leads.id,
      name: leads.name,
      topic: leads.topic,
      status: leads.status,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    }).from(leads)
      .where(and(leadAccess, or(eq(leads.status, "neu"), eq(leads.status, "kontaktiert"))))
      .orderBy(asc(leads.updatedAt))
      .limit(12),
    db.select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      status: tasks.status,
      dueAt: tasks.dueAt,
      entityType: tasks.entityType,
      entityId: tasks.entityId,
    }).from(tasks)
      .where(and(taskCondition, or(eq(tasks.status, "open"), eq(tasks.status, "in_progress"))))
      .orderBy(sql`case when ${tasks.dueAt} is null then 1 else 0 end`, asc(tasks.dueAt), desc(tasks.createdAt))
      .limit(16),
    db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      updatedAt: orders.updatedAt,
    }).from(orders)
      .where(and(orderCondition, sql`${orders.status} not in ('active','rejected','cancelled','storno')`))
      .orderBy(asc(orders.updatedAt))
      .limit(12),
  ]);

  const focus: FocusItem[] = [];

  for (const task of attentionTasks) {
    const overdue = task.dueAt ? task.dueAt.getTime() < now.getTime() : false;
    const dueSoon = task.dueAt ? task.dueAt.getTime() <= next24.getTime() : false;
    if (!overdue && !dueSoon && task.priority !== "critical" && task.priority !== "high") continue;
    const href = task.entityType === "order"
      ? `/portal/auftraege/${task.entityId}`
      : task.entityType === "customer"
        ? `/portal/kunden/${task.entityId}`
        : task.entityType === "lead"
          ? `/portal/leads/${task.entityId}`
          : "/portal/aufgaben";
    focus.push({
      key: `task-${task.id}`,
      kind: "task",
      priority: overdue || task.priority === "critical" ? "critical" : "high",
      title: task.title,
      subtitle: overdue ? "Aufgabe ist überfällig" : task.dueAt ? "Aufgabe ist innerhalb der nächsten 24 Stunden fällig" : `Priorität: ${task.priority}`,
      href,
      timestamp: task.dueAt?.toISOString() ?? null,
    });
  }

  for (const lead of attentionLeads) {
    const age = now.getTime() - lead.createdAt.getTime();
    if (lead.status !== "neu" || age < DAY) continue;
    focus.push({
      key: `lead-${lead.id}`,
      kind: "lead",
      priority: age >= 3 * DAY ? "critical" : "high",
      title: lead.name,
      subtitle: `${lead.topic ?? "Anfrage"} · seit mehr als ${age >= 3 * DAY ? "72" : "24"} Stunden neu`,
      href: `/portal/leads/${lead.id}`,
      timestamp: lead.createdAt.toISOString(),
    });
  }

  for (const order of attentionOrders) {
    const stale = order.updatedAt.getTime() < ago7d.getTime();
    if (order.status !== "documents_missing" && !stale) continue;
    focus.push({
      key: `order-${order.id}`,
      kind: "order",
      priority: order.status === "documents_missing" ? "high" : "normal",
      title: order.orderNumber,
      subtitle: order.status === "documents_missing" ? "Unterlagen fehlen" : "Seit mehr als 7 Tagen ohne Aktualisierung",
      href: `/portal/auftraege/${order.id}`,
      timestamp: order.updatedAt.toISOString(),
    });
  }

  const weight = { critical: 0, high: 1, normal: 2 } as const;
  focus.sort((a, b) => weight[a.priority] - weight[b.priority] || (a.timestamp ?? "").localeCompare(b.timestamp ?? ""));

  const leadSeries: CommandCenterData["leadSeries"] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - i * DAY);
    const key = day.toISOString().slice(0, 10);
    leadSeries.push({
      day: key,
      label: day.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      count: dailyRows.find((row) => row.day === key)?.count ?? 0,
    });
  }

  let team: TeamPulseRow[] = [];
  let taskAssignees: Array<{ id: number; name: string }> = [{ id: user.id, name: user.name }];

  if (user.role === "admin") {
    const [staff, leadLoad, taskLoad, orderLoad] = await Promise.all([
      db.select({ id: employees.id, name: employees.name, role: employees.role })
        .from(employees).where(eq(employees.active, true)).orderBy(employees.name),
      db.select({
        employeeId: leads.assignedEmployeeId,
        openLeads: sql<number>`count(*) filter (where ${leads.status} in ('neu','kontaktiert','termin_bestaetigt','in_beratung'))::int`,
      }).from(leads).where(sql`${leads.assignedEmployeeId} is not null`).groupBy(leads.assignedEmployeeId),
      db.select({
        employeeId: tasks.assignedToEmployeeId,
        openTasks: sql<number>`count(*) filter (where ${tasks.status} in ('open','in_progress'))::int`,
        overdueTasks: sql<number>`count(*) filter (where ${tasks.status} in ('open','in_progress') and ${tasks.dueAt} is not null and ${tasks.dueAt} < ${now})::int`,
      }).from(tasks).where(sql`${tasks.assignedToEmployeeId} is not null`).groupBy(tasks.assignedToEmployeeId),
      db.select({
        employeeId: orders.advisorEmployeeId,
        activeOrders: sql<number>`count(*) filter (where ${orders.status} not in ('active','rejected','cancelled','storno'))::int`,
        wins30: sql<number>`count(*) filter (where ${orders.status} = 'active' and ${orders.activatedAt} >= ${ago30d})::int`,
      }).from(orders).where(sql`${orders.advisorEmployeeId} is not null`).groupBy(orders.advisorEmployeeId),
    ]);

    taskAssignees = staff.map(({ id, name }) => ({ id, name }));
    team = staff.map((person) => {
      const lead = leadLoad.find((row) => row.employeeId === person.id);
      const task = taskLoad.find((row) => row.employeeId === person.id);
      const order = orderLoad.find((row) => row.employeeId === person.id);
      return {
        employeeId: person.id,
        name: person.name,
        role: person.role,
        openLeads: lead?.openLeads ?? 0,
        openTasks: task?.openTasks ?? 0,
        overdueTasks: task?.overdueTasks ?? 0,
        activeOrders: order?.activeOrders ?? 0,
        wins30: order?.wins30 ?? 0,
      };
    }).sort((a, b) => b.overdueTasks - a.overdueTasks || b.openTasks - a.openTasks || b.openLeads - a.openLeads);
  }

  let finance: CommandCenterData["finance"] = null;
  if (isCompensationOwner(user)) {
    const [row] = await db.select({
      confirmed: sql<string>`coalesce(sum(${commissionEvents.confirmedAmount}),0)::text`,
      paid: sql<string>`coalesce(sum(${commissionEvents.paidAmount}),0)::text`,
      overdue: sql<string>`coalesce(sum(case when ${commissionEvents.dueDate} < ${now} and coalesce(${commissionEvents.confirmedAmount},0) > coalesce(${commissionEvents.paidAmount},0) then coalesce(${commissionEvents.confirmedAmount},0) - coalesce(${commissionEvents.paidAmount},0) else 0 end),0)::text`,
    }).from(commissionEvents);
    const confirmed = Number(row?.confirmed ?? 0);
    const paid = Number(row?.paid ?? 0);
    finance = { confirmed, paid, outstanding: confirmed - paid, overdue: Number(row?.overdue ?? 0) };
  }

  return {
    metrics: {
      openLeads: leadMetricsRows[0]?.open ?? 0,
      newLeads24h: leadMetricsRows[0]?.new24 ?? 0,
      untouchedLeads24h: leadMetricsRows[0]?.untouched24 ?? 0,
      dueTasks24h: taskMetricsRows[0]?.due24 ?? 0,
      overdueTasks: taskMetricsRows[0]?.overdue ?? 0,
      activeOrders: orderMetricsRows[0]?.active ?? 0,
      attentionOrders: orderMetricsRows[0]?.attention ?? 0,
      customers: customerRows[0]?.count ?? 0,
      wins30: leadMetricsRows[0]?.wins30 ?? 0,
    },
    leadPipeline: leadPipeline.map((row) => ({ status: row.status, count: row.count })),
    orderPipeline: orderPipeline.map((row) => ({ status: row.status, count: row.count })),
    leadSeries,
    focus: focus.slice(0, 12),
    team,
    taskAssignees,
    finance,
  };
}
