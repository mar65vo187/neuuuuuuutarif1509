import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { financialLedgerEntries } from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";
import { isCompensationOwner } from "@/lib/compensation";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type FinancialLedgerInput = {
  sourceKey: string;
  eventType: string;
  scope: "provider" | "company" | "employee" | "growth_pool" | "reconciliation";
  entityType: string;
  entityId?: string | number | null;
  orderId?: number | null;
  employeeId?: number | null;
  actorEmployeeId?: number | null;
  amount?: number | string | null;
  currency?: string;
  effect?: "increase" | "decrease" | "none";
  reference?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
};

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error("Ungültiger Finanzbetrag.");
  return amount.toFixed(2);
}

export async function appendFinancialLedger(tx: Tx, input: FinancialLedgerInput) {
  const [entry] = await tx.insert(financialLedgerEntries).values({
    sourceKey: input.sourceKey,
    eventType: input.eventType,
    scope: input.scope,
    entityType: input.entityType,
    entityId: input.entityId === null || input.entityId === undefined ? null : String(input.entityId),
    orderId: input.orderId ?? null,
    employeeId: input.employeeId ?? null,
    actorEmployeeId: input.actorEmployeeId ?? null,
    amount: money(input.amount),
    currency: input.currency ?? "EUR",
    effect: input.effect ?? "none",
    reference: input.reference?.trim() || null,
    metadata: input.metadata ?? {},
    occurredAt: input.occurredAt ?? new Date(),
  }).onConflictDoNothing({ target: financialLedgerEntries.sourceKey }).returning();
  return entry ?? null;
}

export async function listFinancialLedger(user: SessionUser, limit = 150) {
  if (!isCompensationOwner(user)) return [];
  return db.select().from(financialLedgerEntries)
    .orderBy(desc(financialLedgerEntries.occurredAt), desc(financialLedgerEntries.id))
    .limit(Math.max(1, Math.min(limit, 500)));
}

export async function getFinancialLedgerEntry(sourceKey: string) {
  const [row] = await db.select().from(financialLedgerEntries)
    .where(eq(financialLedgerEntries.sourceKey, sourceKey))
    .limit(1);
  return row ?? null;
}
