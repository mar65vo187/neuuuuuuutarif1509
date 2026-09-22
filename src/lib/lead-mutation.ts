import { and, eq, inArray, ne } from "drizzle-orm";
import type { db } from "@/db";
import { tasks } from "@/db/enterprise-schema";

type LeadTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function isTerminalLeadStatus(status: string): boolean {
  return status === "abgeschlossen" || status === "verloren";
}

export async function reassignLeadFollowUps(
  tx: LeadTransaction,
  leadIds: number[],
  ownerId: number,
  now: Date,
) {
  const ids = [...new Set(leadIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (!ids.length) return 0;
  const rows = await tx.update(tasks).set({
    assignedToEmployeeId: ownerId,
    updatedAt: now,
  }).where(and(
    eq(tasks.entityType, "lead"),
    eq(tasks.type, "crm_follow_up"),
    inArray(tasks.entityId, ids),
    inArray(tasks.status, ["open", "in_progress"]),
  )).returning({ id: tasks.id });
  return rows.length;
}

/** The caller must hold the lead's row lock for the entire transaction. */
export async function syncLeadFollowUp(tx: LeadTransaction, input: {
  leadId: number;
  actorId: number;
  ownerId: number;
  title: string;
  priority: string;
  dueAt: Date | null;
  now: Date;
  description?: string;
}) {
  const activeFollowUps = and(
    eq(tasks.entityType, "lead"),
    eq(tasks.entityId, input.leadId),
    eq(tasks.type, "crm_follow_up"),
    inArray(tasks.status, ["open", "in_progress"]),
  );
  const cancel = { status: "cancelled", completedAt: null, updatedAt: input.now };

  if (!input.dueAt) {
    // Old duplicates must also stop when a lead closes or its reminder is removed.
    await tx.update(tasks).set(cancel).where(activeFollowUps);
    return;
  }

  const [existing] = await tx.select({ id: tasks.id }).from(tasks)
    .where(activeFollowUps).orderBy(tasks.createdAt, tasks.id).limit(1);
  const values = {
    assignedToEmployeeId: input.ownerId,
    title: input.title,
    ...(input.description !== undefined ? { description: input.description } : {}),
    priority: input.priority === "hot" ? "critical" : input.priority === "high" ? "high" : "normal",
    status: "open",
    dueAt: input.dueAt,
    completedAt: null,
    updatedAt: input.now,
  };

  if (existing) {
    await tx.update(tasks).set(values).where(eq(tasks.id, existing.id));
    await tx.update(tasks).set(cancel).where(and(activeFollowUps, ne(tasks.id, existing.id)));
  } else {
    await tx.insert(tasks).values({
      entityType: "lead",
      entityId: input.leadId,
      createdByEmployeeId: input.actorId,
      type: "crm_follow_up",
      ...values,
    });
  }
}
