import { createHmac } from "node:crypto";
import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { outboxEvents, webhookDeliveries, webhookEndpoints } from "@/db/enterprise-schema";
import { decryptMfaSecret } from "@/lib/mfa";

function signature(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function processOutbox(limit = 25) {
  const events = await db.select().from(outboxEvents)
    .where(and(eq(outboxEvents.status, "pending"), lte(outboxEvents.availableAt, new Date())))
    .orderBy(asc(outboxEvents.createdAt))
    .limit(Math.max(1, Math.min(limit, 100)));
  if (events.length === 0) return { processed: 0, failed: 0 };

  const endpoints = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.active, true));
  let processed = 0;
  let failed = 0;

  for (const event of events) {
    const targets = endpoints.filter((endpoint) => endpoint.eventTypes.includes("*") || endpoint.eventTypes.includes(event.eventType));
    if (targets.length === 0) {
      await db.update(outboxEvents).set({ status: "processed", processedAt: new Date() }).where(eq(outboxEvents.id, event.id));
      processed += 1;
      continue;
    }

    let allOk = true;
    let lastError = "";
    for (const endpoint of targets) {
      const payload = JSON.stringify({
        id: event.id,
        event: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        createdAt: event.createdAt.toISOString(),
        data: event.payload,
      });
      const secret = endpoint.secretHash ? decryptMfaSecret(endpoint.secretHash) : null;
      let responseCode: number | null = null;
      let errorText: string | null = null;
      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TarifWerk-Webhook/1.0",
            ...(secret ? { "X-TarifWerk-Signature": `sha256=${signature(secret, payload)}` } : {}),
            "X-TarifWerk-Event": event.eventType,
          },
          body: payload,
          signal: AbortSignal.timeout(10000),
        });
        responseCode = response.status;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        allOk = false;
        errorText = error instanceof Error ? error.message.slice(0, 500) : "delivery_failed";
        lastError = errorText;
      }
      await db.insert(webhookDeliveries).values({
        endpointId: endpoint.id,
        outboxEventId: event.id,
        status: errorText ? "failed" : "delivered",
        responseCode,
        attempts: event.attempts + 1,
        lastError: errorText,
        deliveredAt: errorText ? null : new Date(),
        nextAttemptAt: new Date(),
      });
    }

    if (allOk) {
      await db.update(outboxEvents).set({ status: "processed", processedAt: new Date(), lastError: null }).where(eq(outboxEvents.id, event.id));
      processed += 1;
    } else {
      const attempts = event.attempts + 1;
      const retryMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
      await db.update(outboxEvents).set({
        status: attempts >= 6 ? "failed" : "pending",
        attempts,
        lastError,
        availableAt: new Date(Date.now() + retryMinutes * 60_000),
      }).where(eq(outboxEvents.id, event.id));
      failed += 1;
    }
  }

  return { processed, failed };
}
