import { eq } from "drizzle-orm";
import { db } from "@/db";
import { operationsPolicy } from "@/db/enterprise-schema";
import {
  DEFAULT_OPERATIONS_POLICY,
  type OperationsPolicySnapshot,
} from "@/lib/operations-policy-shared";

function databaseErrorCode(error: unknown) {
  if (typeof error !== "object" || !error) return "";
  if ("code" in error) return String((error as { code?: unknown }).code ?? "");
  if ("cause" in error) return String((error as { cause?: { code?: unknown } }).cause?.code ?? "");
  return "";
}

export async function getOperationsPolicy(): Promise<OperationsPolicySnapshot> {
  try {
    const [row] = await db.select().from(operationsPolicy)
      .where(eq(operationsPolicy.policyKey, "default"))
      .limit(1);
    if (!row) return { ...DEFAULT_OPERATIONS_POLICY, updatedByEmployeeId: null, updatedAt: null };
    return {
      leadNextActionMissingHours: row.leadNextActionMissingHours,
      leadNextActionHighHours: row.leadNextActionHighHours,
      customerReviewHighDays: row.customerReviewHighDays,
      opportunityReviewHighDays: row.opportunityReviewHighDays,
      orderStaleDays: row.orderStaleDays,
      providerReferenceMissingHours: row.providerReferenceMissingHours,
      providerStatusMissingHours: row.providerStatusMissingHours,
      activationStaleDays: row.activationStaleDays,
      documentsStaleHours: row.documentsStaleHours,
      updatedByEmployeeId: row.updatedByEmployeeId,
      updatedAt: row.updatedAt,
    };
  } catch (error) {
    if (databaseErrorCode(error) !== "42P01") throw error;
    return { ...DEFAULT_OPERATIONS_POLICY, updatedByEmployeeId: null, updatedAt: null };
  }
}
