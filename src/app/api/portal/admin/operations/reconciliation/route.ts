import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { commissionEvents, orders, providers, reconciliationImports, reconciliationIssues } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { isCompensationOwner } from "@/lib/compensation";
import { writeAudit } from "@/lib/enterprise";
import { reconciliationImportSchema } from "@/lib/operations-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    if (!isCompensationOwner(admin)) return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf Provider-Abrechnungen importieren." }, { status: 403 });

    const parsed = reconciliationImportSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Abrechnung ungültig." }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [provider] = await tx.select({ id: providers.id }).from(providers).where(eq(providers.id, parsed.data.providerId)).limit(1);
      if (!provider) throw new Error("PROVIDER_NOT_FOUND");

      let matched = 0;
      let issues = 0;
      for (const row of parsed.data.rows) {
        const [order] = await tx.select({
          id: orders.id,
          expectedCommission: orders.expectedCommission,
        }).from(orders).where(and(
          eq(orders.providerId, provider.id),
          eq(orders.externalOrderId, row.externalOrderId),
        )).limit(1);

        if (!order) {
          issues += 1;
          await tx.insert(reconciliationIssues).values({
            providerId: provider.id,
            type: "unknown_order",
            status: "open",
            reportedAmount: String(row.reportedAmount),
            differenceAmount: String(row.reportedAmount),
            reference: row.reference || row.externalOrderId,
            note: `Keine interne Auftrags-ID für externe Referenz ${row.externalOrderId} gefunden.`,
          });
          continue;
        }

        matched += 1;
        const expected = Number(order.expectedCommission ?? 0);
        const difference = Math.round((row.reportedAmount - expected) * 100) / 100;
        if (Math.abs(difference) > 0.009) {
          issues += 1;
          await tx.insert(reconciliationIssues).values({
            orderId: order.id,
            providerId: provider.id,
            type: row.reportedAmount < expected ? "underpayment" : "overpayment",
            status: "open",
            expectedAmount: String(expected),
            reportedAmount: String(row.reportedAmount),
            differenceAmount: String(difference),
            reference: row.reference || row.externalOrderId,
            note: "Provider-Abrechnung weicht von der intern erwarteten Provision ab.",
          });
        } else {
          await tx.update(commissionEvents).set({
            confirmedAmount: String(row.reportedAmount),
            status: "provider_confirmed",
            providerReference: row.reference || row.externalOrderId,
            updatedAt: new Date(),
          }).where(and(eq(commissionEvents.orderId, order.id), eq(commissionEvents.type, "sale")));
        }
      }

      const [importRow] = await tx.insert(reconciliationImports).values({
        providerId: provider.id,
        sourceName: parsed.data.sourceName,
        rowCount: parsed.data.rows.length,
        matchedCount: matched,
        issueCount: issues,
        importedByEmployeeId: admin.id,
      }).returning({ id: reconciliationImports.id });

      await writeAudit(tx, admin.id, "reconciliation.imported", "reconciliation_import", importRow.id, undefined, {
        providerId: provider.id,
        rows: parsed.data.rows.length,
        matched,
        issues,
      });
      return { id: importRow.id, matched, issues };
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PROVIDER_NOT_FOUND") return NextResponse.json({ ok: false, error: "Provider nicht gefunden." }, { status: 404 });
    return adminFailure(error);
  }
}
