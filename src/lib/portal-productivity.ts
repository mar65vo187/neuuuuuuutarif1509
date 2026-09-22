import { and, desc, eq, gt, ilike, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  automationRules,
  automationRuns,
  notificationQueue,
  outboxEvents,
  savedViews,
  webhookDeliveries,
  webhookEndpoints,
} from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";

export async function listSavedViews(user: SessionUser, area: string) {
  return db.select()
    .from(savedViews)
    .where(and(eq(savedViews.employeeId, user.id), eq(savedViews.area, area)))
    .orderBy(desc(savedViews.isDefault), savedViews.name);
}

export type NotificationInboxView = "active" | "unread" | "read" | "snoozed" | "archived";

export async function listInAppNotifications(user: SessionUser, options: {
  view?: NotificationInboxView;
  priority?: "normal" | "high" | "critical";
  q?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const now = new Date();
  const view = options.view ?? "active";
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 25, 100));
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const q = options.q?.trim().slice(0, 120) || undefined;
  const availableNow = or(isNull(notificationQueue.snoozedUntil), lte(notificationQueue.snoozedUntil, now));

  const viewCondition = view === "unread"
    ? and(isNull(notificationQueue.archivedAt), availableNow, eq(notificationQueue.status, "pending"))
    : view === "read"
      ? and(isNull(notificationQueue.archivedAt), availableNow, eq(notificationQueue.status, "read"))
      : view === "snoozed"
        ? and(isNull(notificationQueue.archivedAt), gt(notificationQueue.snoozedUntil, now))
        : view === "archived"
          ? isNotNull(notificationQueue.archivedAt)
          : and(isNull(notificationQueue.archivedAt), availableNow);

  const condition = and(
    eq(notificationQueue.employeeId, user.id),
    eq(notificationQueue.channel, "in_app"),
    lte(notificationQueue.scheduledAt, now),
    viewCondition,
    options.priority ? eq(notificationQueue.priority, options.priority) : undefined,
    q ? or(
      ilike(notificationQueue.subject, `%${q}%`),
      ilike(notificationQueue.body, `%${q}%`),
      ilike(notificationQueue.category, `%${q}%`),
    ) : undefined,
  );

  const baseStatsCondition = and(
    eq(notificationQueue.employeeId, user.id),
    eq(notificationQueue.channel, "in_app"),
    lte(notificationQueue.scheduledAt, now),
  );

  const [rows, countRows, statsRows] = await Promise.all([
    db.select()
      .from(notificationQueue)
      .where(condition)
      .orderBy(
        sql`case ${notificationQueue.priority} when 'critical' then 0 when 'high' then 1 else 2 end`,
        desc(notificationQueue.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` })
      .from(notificationQueue)
      .where(condition),
    db.select({
      active: sql<number>`count(*) filter (where ${notificationQueue.archivedAt} is null and (${notificationQueue.snoozedUntil} is null or ${notificationQueue.snoozedUntil} <= ${now}))::int`,
      unread: sql<number>`count(*) filter (where ${notificationQueue.archivedAt} is null and ${notificationQueue.status} = 'pending' and (${notificationQueue.snoozedUntil} is null or ${notificationQueue.snoozedUntil} <= ${now}))::int`,
      urgent: sql<number>`count(*) filter (where ${notificationQueue.archivedAt} is null and ${notificationQueue.priority} in ('high','critical') and (${notificationQueue.snoozedUntil} is null or ${notificationQueue.snoozedUntil} <= ${now}))::int`,
      snoozed: sql<number>`count(*) filter (where ${notificationQueue.archivedAt} is null and ${notificationQueue.snoozedUntil} > ${now})::int`,
      archived: sql<number>`count(*) filter (where ${notificationQueue.archivedAt} is not null)::int`,
    }).from(notificationQueue).where(baseStatsCondition),
  ]);

  const total = countRows[0]?.count ?? 0;
  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    stats: {
      active: statsRows[0]?.active ?? 0,
      unread: statsRows[0]?.unread ?? 0,
      urgent: statsRows[0]?.urgent ?? 0,
      snoozed: statsRows[0]?.snoozed ?? 0,
      archived: statsRows[0]?.archived ?? 0,
    },
  };
}

export async function getUnreadNotificationCount(user: SessionUser) {
  const now = new Date();
  const [row] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(notificationQueue)
    .where(and(
      eq(notificationQueue.employeeId, user.id),
      eq(notificationQueue.channel, "in_app"),
      eq(notificationQueue.status, "pending"),
      isNull(notificationQueue.archivedAt),
      lte(notificationQueue.scheduledAt, now),
      or(isNull(notificationQueue.snoozedUntil), lte(notificationQueue.snoozedUntil, now)),
    ));
  return row?.count ?? 0;
}

export async function getAdminAutomationHealth() {
  const [
    ruleRows,
    runRows,
    webhookRows,
    endpointRows,
    deliveryRows,
    outboxRows,
  ] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${automationRules.active} = true)::int`,
    }).from(automationRules),
    db.select({
      id: automationRuns.id,
      ruleId: automationRuns.ruleId,
      ruleName: automationRules.name,
      eventType: automationRuns.eventType,
      entityType: automationRuns.entityType,
      entityId: automationRuns.entityId,
      status: automationRuns.status,
      detail: automationRuns.detail,
      createdAt: automationRuns.createdAt,
      finishedAt: automationRuns.finishedAt,
    }).from(automationRuns)
      .leftJoin(automationRules, eq(automationRuns.ruleId, automationRules.id))
      .orderBy(desc(automationRuns.createdAt))
      .limit(40),
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${webhookEndpoints.active} = true)::int`,
    }).from(webhookEndpoints),
    db.select({
      id: webhookEndpoints.id,
      name: webhookEndpoints.name,
      url: webhookEndpoints.url,
      eventTypes: webhookEndpoints.eventTypes,
      active: webhookEndpoints.active,
      createdAt: webhookEndpoints.createdAt,
    }).from(webhookEndpoints).orderBy(webhookEndpoints.name),
    db.select({
      id: webhookDeliveries.id,
      endpointName: webhookEndpoints.name,
      status: webhookDeliveries.status,
      responseCode: webhookDeliveries.responseCode,
      attempts: webhookDeliveries.attempts,
      lastError: webhookDeliveries.lastError,
      createdAt: webhookDeliveries.createdAt,
      deliveredAt: webhookDeliveries.deliveredAt,
    }).from(webhookDeliveries)
      .innerJoin(webhookEndpoints, eq(webhookDeliveries.endpointId, webhookEndpoints.id))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(40),
    db.select({
      pending: sql<number>`count(*) filter (where ${outboxEvents.status} = 'pending')::int`,
      failed: sql<number>`count(*) filter (where ${outboxEvents.status} = 'failed')::int`,
      processed: sql<number>`count(*) filter (where ${outboxEvents.status} = 'processed')::int`,
      ready: sql<number>`count(*) filter (where ${outboxEvents.status} = 'pending' and ${outboxEvents.availableAt} <= now())::int`,
    }).from(outboxEvents),
  ]);

  const failedRuns = runRows.filter((row) => row.status === "failed").length;
  const failedDeliveries = deliveryRows.filter((row) => row.status === "failed").length;

  return {
    rules: { total: ruleRows[0]?.total ?? 0, active: ruleRows[0]?.active ?? 0 },
    runs: runRows,
    runHealth: { recent: runRows.length, failed: failedRuns },
    webhooks: { total: webhookRows[0]?.total ?? 0, active: webhookRows[0]?.active ?? 0, endpoints: endpointRows },
    deliveries: deliveryRows,
    deliveryHealth: { recent: deliveryRows.length, failed: failedDeliveries },
    outbox: {
      pending: outboxRows[0]?.pending ?? 0,
      failed: outboxRows[0]?.failed ?? 0,
      processed: outboxRows[0]?.processed ?? 0,
      ready: outboxRows[0]?.ready ?? 0,
    },
  };
}
