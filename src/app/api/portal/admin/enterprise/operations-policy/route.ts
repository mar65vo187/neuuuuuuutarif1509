import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { operationsPolicy } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, readAdminJson } from "@/lib/admin-server";
import { operationsPolicyUpdateSchema } from "@/lib/enterprise-validation";
import { DEFAULT_OPERATIONS_POLICY, type OperationsPolicyValues } from "@/lib/operations-policy-shared";
import { writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

function valuesOf(row: Partial<OperationsPolicyValues>): OperationsPolicyValues {
  return {
    leadNextActionMissingHours: row.leadNextActionMissingHours ?? DEFAULT_OPERATIONS_POLICY.leadNextActionMissingHours,
    leadNextActionHighHours: row.leadNextActionHighHours ?? DEFAULT_OPERATIONS_POLICY.leadNextActionHighHours,
    customerReviewHighDays: row.customerReviewHighDays ?? DEFAULT_OPERATIONS_POLICY.customerReviewHighDays,
    opportunityReviewHighDays: row.opportunityReviewHighDays ?? DEFAULT_OPERATIONS_POLICY.opportunityReviewHighDays,
    orderStaleDays: row.orderStaleDays ?? DEFAULT_OPERATIONS_POLICY.orderStaleDays,
    providerReferenceMissingHours: row.providerReferenceMissingHours ?? DEFAULT_OPERATIONS_POLICY.providerReferenceMissingHours,
    providerStatusMissingHours: row.providerStatusMissingHours ?? DEFAULT_OPERATIONS_POLICY.providerStatusMissingHours,
    activationStaleDays: row.activationStaleDays ?? DEFAULT_OPERATIONS_POLICY.activationStaleDays,
    documentsStaleHours: row.documentsStaleHours ?? DEFAULT_OPERATIONS_POLICY.documentsStaleHours,
    serviceCriticalHours: row.serviceCriticalHours ?? DEFAULT_OPERATIONS_POLICY.serviceCriticalHours,
    serviceHighHours: row.serviceHighHours ?? DEFAULT_OPERATIONS_POLICY.serviceHighHours,
    serviceNormalHours: row.serviceNormalHours ?? DEFAULT_OPERATIONS_POLICY.serviceNormalHours,
    serviceLowHours: row.serviceLowHours ?? DEFAULT_OPERATIONS_POLICY.serviceLowHours,
  };
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const parsed = operationsPolicyUpdateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Bitte SLA-Werte prüfen." },
        { status: 422 },
      );
    }

    const policy = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(operationsPolicy)
        .where(eq(operationsPolicy.policyKey, "default"))
        .limit(1)
        .for("update");
      const oldValues = valuesOf(existing ?? {});
      const now = new Date();

      const [updated] = existing
        ? await tx.update(operationsPolicy).set({
            ...parsed.data,
            updatedByEmployeeId: admin.id,
            updatedAt: now,
          }).where(eq(operationsPolicy.policyKey, "default")).returning()
        : await tx.insert(operationsPolicy).values({
            policyKey: "default",
            ...parsed.data,
            updatedByEmployeeId: admin.id,
            updatedAt: now,
          }).returning();

      await writeAudit(
        tx,
        admin.id,
        "operations_policy.updated",
        "operations_policy",
        "default",
        oldValues,
        valuesOf(updated),
      );
      return updated;
    });

    return NextResponse.json({ ok: true, policy: valuesOf(policy) });
  } catch (error) {
    return adminFailure(error);
  }
}
