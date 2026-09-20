import { and, asc, desc, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees, leads } from "@/db/schema";
import { auditEvents, commissionEvents, customers, orders, tasks } from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";
import { isCompensationOwner } from "@/lib/compensation";
import { leadAccessCondition } from "@/lib/queries";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MOMENTUM_HISTORY_DAYS = 120;

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

export type MomentumDay = {
  day: string;
  label: string;
  count: number;
  isToday: boolean;
};

export type MomentumData = {
  today: number;
  minimumDaily: number;
  dailyTarget: number;
  currentStreak: number;
  streakAtRisk: boolean;
  activeDays7: number;
  leads7: number;
  week: MomentumDay[];
  nextMilestone: number;
  nextMilestoneRemaining: number;
  status: "start" | "streak" | "complete";
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
    hotLeads: number;
    dueLeadFollowUpsToday: number;
    leadsMissingNextAction: number;
    leadsWithoutProduct: number;
  };
  leadPipeline: Array<{ status: string; count: number }>;
  orderPipeline: Array<{ status: string; count: number }>;
  leadSeries: Array<{ day: string; label: string; count: number }>;
  focus: FocusItem[];
  team: TeamPulseRow[];
  taskAssignees: Array<{ id: number; name: string }>;
  momentum: MomentumData;
  finance: null | {
    confirmed: number;
    paid: number;
    outstanding: number;
    overdue: number;
  };
  integrity: null | {
    unassignedOpenLeads: number;
    unownedCustomers: number;
    unassignedOpenOrders: number;
    unassignedOpenTasks: number;
    overdueLeadActions: number;
    staleOrders: number;
    auditEvents24h: number;
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
    momentumRows,
  ] = await Promise.all([
    db.select({
      open: sql<number>`count(*) filter (where ${leads.status} in ('neu','kontaktiert','termin_bestaetigt','in_beratung'))::int`,
      new24: sql<number>`count(*) filter (where ${leads.createdAt} >= ${ago24})::int`,
      untouched24: sql<number>`count(*) filter (where ${leads.status} = 'neu' and ${leads.createdAt} < ${ago24})::int`,
      wins30: sql<number>`count(*) filter (where ${leads.status} = 'abgeschlossen' and ${leads.updatedAt} >= ${ago30d})::int`,
      hotLeads: sql<number>`count(*) filter (where ${leads.priority} in ('high','hot') and ${leads.status} not in ('abgeschlossen','verloren'))::int`,
      dueToday: sql<number>`count(*) filter (where ${leads.nextActionAt} >= date_trunc('day', now()) and ${leads.nextActionAt} < date_trunc('day', now()) + interval '1 day' and ${leads.status} not in ('abgeschlossen','verloren'))::int`,
      missingNext: sql<number>`count(*) filter (where ${leads.nextActionAt} is null and ${leads.status} not in ('termin_bestaetigt','abgeschlossen','verloren'))::int`,
      withoutProduct: sql<number>`count(*) filter (where not exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id}) and ${leads.status} not in ('abgeschlossen','verloren'))::int`,
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
    db.select({
      day: sql<string>`to_char(timezone('Europe/Berlin', ${leads.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    }).from(leads)
      .where(and(
        eq(leads.createdByEmployeeId, user.id),
        gte(leads.createdAt, new Date(now.getTime() - MOMENTUM_HISTORY_DAYS * DAY)),
      ))
      .groupBy(sql`to_char(timezone('Europe/Berlin', ${leads.createdAt}), 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(timezone('Europe/Berlin', ${leads.createdAt}), 'YYYY-MM-DD')`),
  ]);

  const berlinParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => berlinParts.find((item) => item.type === type)?.value ?? "";
  const berlinAnchor = new Date(Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day")), 12));
  const keyForOffset = (offset: number) => {
    const date = new Date(berlinAnchor);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const momentumByDay = new Map(momentumRows.map((row) => [row.day, row.count] as const));
  const week: MomentumDay[] = Array.from({ length: 7 }, (_, index) => {
    const offset = index - 6;
    const key = keyForOffset(offset);
    const date = new Date(`${key}T12:00:00Z`);
    return {
      day: key,
      label: new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(date).replace(".", ""),
      count: momentumByDay.get(key) ?? 0,
      isToday: offset === 0,
    };
  });
  const today = momentumByDay.get(keyForOffset(0)) ?? 0;
  const yesterday = momentumByDay.get(keyForOffset(-1)) ?? 0;
  let currentStreak = 0;
  const streakStartOffset = today > 0 ? 0 : yesterday > 0 ? -1 : null;
  if (streakStartOffset !== null) {
    for (let offset = streakStartOffset; offset >= -(MOMENTUM_HISTORY_DAYS - 1); offset--) {
      if ((momentumByDay.get(keyForOffset(offset)) ?? 0) <= 0) break;
      currentStreak += 1;
    }
  }
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find((value) => value > currentStreak) ?? Math.ceil((currentStreak + 1) / 100) * 100;
  const momentum: MomentumData = {
    today,
    minimumDaily: 1,
    dailyTarget: 2,
    currentStreak,
    streakAtRisk: today === 0 && yesterday > 0,
    activeDays7: week.filter((day) => day.count > 0).length,
    leads7: week.reduce((sum, day) => sum + day.count, 0),
    week,
    nextMilestone,
    nextMilestoneRemaining: Math.max(0, nextMilestone - currentStreak),
    status: today >= 2 ? "complete" : today === 1 ? "streak" : "start",
  };

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
      title: lead.name || `Lead #${lead.id}`,
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

  let integrity: CommandCenterData["integrity"] = null;
  if (user.role === "admin") {
    const [leadRow, customerRow, orderRow, taskRow, auditRow] = await Promise.all([
      db.select({
        unassigned: sql<number>`count(*) filter (where ${leads.assignedEmployeeId} is null and ${leads.status} not in ('abgeschlossen','verloren'))::int`,
        overdueAction: sql<number>`count(*) filter (where ${leads.nextActionAt} is not null and ${leads.nextActionAt} < ${now} and ${leads.status} not in ('abgeschlossen','verloren'))::int`,
      }).from(leads),
      db.select({
        unowned: sql<number>`count(*) filter (where ${customers.ownerEmployeeId} is null and ${customers.archivedAt} is null)::int`,
      }).from(customers),
      db.select({
        unassigned: sql<number>`count(*) filter (where ${orders.advisorEmployeeId} is null and ${orders.status} not in ('active','rejected','cancelled','storno'))::int`,
        stale: sql<number>`count(*) filter (where ${orders.updatedAt} < ${ago7d} and ${orders.status} not in ('active','rejected','cancelled','storno'))::int`,
      }).from(orders),
      db.select({
        unassigned: sql<number>`count(*) filter (where ${tasks.assignedToEmployeeId} is null and ${tasks.status} in ('open','in_progress'))::int`,
      }).from(tasks),
      db.select({
        count: sql<number>`count(*) filter (where ${auditEvents.createdAt} >= ${ago24})::int`,
      }).from(auditEvents),
    ]);
    integrity = {
      unassignedOpenLeads: leadRow[0]?.unassigned ?? 0,
      unownedCustomers: customerRow[0]?.unowned ?? 0,
      unassignedOpenOrders: orderRow[0]?.unassigned ?? 0,
      unassignedOpenTasks: taskRow[0]?.unassigned ?? 0,
      overdueLeadActions: leadRow[0]?.overdueAction ?? 0,
      staleOrders: orderRow[0]?.stale ?? 0,
      auditEvents24h: auditRow[0]?.count ?? 0,
    };
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
      hotLeads: leadMetricsRows[0]?.hotLeads ?? 0,
      dueLeadFollowUpsToday: leadMetricsRows[0]?.dueToday ?? 0,
      leadsMissingNextAction: leadMetricsRows[0]?.missingNext ?? 0,
      leadsWithoutProduct: leadMetricsRows[0]?.withoutProduct ?? 0,
    },
    leadPipeline: leadPipeline.map((row) => ({ status: row.status, count: row.count })),
    orderPipeline: orderPipeline.map((row) => ({ status: row.status, count: row.count })),
    leadSeries,
    focus: focus.slice(0, 12),
    team,
    taskAssignees,
    momentum,
    finance,
    integrity,
  };
}
