import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { commissionEvents, orders, reconciliationIssues } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { isCompensationOwner } from "@/lib/compensation";
import { writeAudit } from "@/lib/enterprise";
import { reconciliationResolveSchema } from "@/lib/operations-validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    if (!isCompensationOwner(admin)) {
      return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf Abweichungen abschließen." }, { status: 403 });
    }

    const rawId = (await context.params).id;
    if (!/^\d+$/.test(rawId)) {
      return NextResponse.json({ ok: false, error: "Ungültige Abweichungs-ID." }, { status: 400 });
    }
    const issueId = Number(rawId);
    const parsed = reconciliationResolveSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Aktion ungültig." }, { status: 422 });
    }

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [issue] = await tx.select().from(reconciliationIssues)
        .where(eq(reconciliationIssues.id, issueId)).limit(1).for("update");
      if (!issue) throw new Error("ISSUE_NOT_FOUND");
      if (issue.status !== "open") throw new Error("ISSUE_ALREADY_RESOLVED");

      if (parsed.data.action === "accept_reported") {
        if (!issue.orderId || issue.reportedAmount === null) throw new Error("ISSUE_NOT_APPLICABLE");

        const [order] = await tx.select({
          advisorEmployeeId: orders.advisorEmployeeId,
          expectedCommission: orders.expectedCommission,
        }).from(orders).where(eq(orders.id, issue.orderId)).limit(1);
        if (!order) throw new Error("ISSUE_NOT_APPLICABLE");

        const [saleEvent] = await tx.select().from(commissionEvents)
          .where(and(eq(commissionEvents.orderId, issue.orderId), eq(commissionEvents.type, "sale")))
          .limit(1)
          .for("update");

        const eventValues = {
          confirmedAmount: issue.reportedAmount,
          status: "provider_confirmed",
          providerReference: issue.reference,
          updatedAt: new Date(),
        };

        if (saleEvent) {
          await tx.update(commissionEvents).set(eventValues).where(eq(commissionEvents.id, saleEvent.id));
        } else {
          await tx.insert(commissionEvents).values({
            orderId: issue.orderId,
            employeeId: order.advisorEmployeeId,
            type: "sale",
            expectedAmount: issue.expectedAmount ?? order.expectedCommission ?? issue.reportedAmount,
            ...eventValues,
          });
        }
      }

      const resolutionLabel = parsed.data.action === "accept_reported"
        ? "Provider-Betrag übernommen."
        : parsed.data.action === "keep_expected"
          ? "Interner Sollwert beibehalten."
          : "Abweichung bewusst geschlossen.";

      const [updated] = await tx.update(reconciliationIssues).set({
        status: "resolved",
        assignedToEmployeeId: admin.id,
        resolvedAt: new Date(),
        note: [issue.note, resolutionLabel, parsed.data.note?.trim()].filter(Boolean).join(" "),
      }).where(eq(reconciliationIssues.id, issue.id)).returning();

      await writeAudit(tx, admin.id, "reconciliation.resolved", "reconciliation_issue", issue.id, {
        status: issue.status,
        expectedAmount: issue.expectedAmount,
        reportedAmount: issue.reportedAmount,
      }, {
        status: updated.status,
        action: parsed.data.action,
        note: parsed.data.note?.trim() || null,
      });

      return updated;
    });

    return NextResponse.json({ ok: true, id: result.id, status: result.status });
  } catch (error) {
    if (error instanceof Error && error.message === "ISSUE_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Abweichung nicht gefunden." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "ISSUE_ALREADY_RESOLVED") {
      return NextResponse.json({ ok: false, error: "Diese Abweichung wurde bereits abgeschlossen." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ISSUE_NOT_APPLICABLE") {
      return NextResponse.json({ ok: false, error: "Für diese Abweichung kann kein Provider-Betrag automatisch übernommen werden." }, { status: 422 });
    }
    return adminFailure(error);
  }
}
