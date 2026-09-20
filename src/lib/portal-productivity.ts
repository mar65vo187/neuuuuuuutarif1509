import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
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

export async function listInAppNotifications(user: SessionUser, limit = 100) {
  return db.select()
    .from(notificationQueue)
    .where(and(
      eq(notificationQueue.employeeId, user.id),
      eq(notificationQueue.channel, "in_app"),
    ))
    .orderBy(desc(notificationQueue.createdAt))
    .limit(Math.max(1, Math.min(limit, 200)));
}

export async function getUnreadNotificationCount(user: SessionUser) {
  const [row] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(notificationQueue)
    .where(and(
      eq(notificationQueue.employeeId, user.id),
      eq(notificationQueue.channel, "in_app"),
      eq(notificationQueue.status, "pending"),
    ));
  return row?.count ?? 0;
}

export async function getAdminAutomationHealth() {
  const [
    ruleRows,
    runRows,
    webhookRows,
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
    webhooks: { total: webhookRows[0]?.total ?? 0, active: webhookRows[0]?.active ?? 0 },
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
