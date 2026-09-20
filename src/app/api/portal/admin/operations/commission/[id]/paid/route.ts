import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { benefitPoolLedger, commissionEvents, orders } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { isCompensationOwner } from "@/lib/compensation";
import { writeAudit } from "@/lib/enterprise";
import { appendFinancialLedger } from "@/lib/finance-ledger";
import { commissionPaidSchema } from "@/lib/operations-validation";

export const dynamic = "force-dynamic";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    if (!isCompensationOwner(admin)) {
      return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf Provider-Provisionen als bezahlt markieren." }, { status: 403 });
    }

    const raw = (await context.params).id;
    if (!/^\d+$/.test(raw)) {
      return NextResponse.json({ ok: false, error: "Ungültige Provisions-ID." }, { status: 400 });
    }
    const id = Number(raw);

    const parsed = commissionPaidSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Zahlungsdaten ungültig." }, { status: 422 });
    }

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);

      const [event] = await tx.select().from(commissionEvents)
        .where(eq(commissionEvents.id, id)).limit(1).for("update");
      if (!event || event.type !== "sale") throw new Error("COMMISSION_NOT_FOUND");

      const [order] = await tx.select({
        orderNumber: orders.orderNumber,
        status: orders.status,
      }).from(orders).where(eq(orders.id, event.orderId)).limit(1);
      if (!order) throw new Error("COMMISSION_NOT_FOUND");

      const amount = roundMoney(parsed.data.amount);
      const poolAmount = roundMoney(amount * 0.15);
      const now = new Date();
      const previousPaid = Number(event.paidAmount ?? 0);
      const reference = parsed.data.providerReference?.trim() || order.orderNumber || event.providerReference || null;

      if (event.status === "paid") {
        if (Math.abs(previousPaid - amount) <= 0.009) {
          return {
            commissionEventId: event.id,
            paidAmount: previousPaid,
            ownerPoolAmount: roundMoney(previousPaid * 0.15),
            stornoReversalApplied: ["cancelled", "storno"].includes(order.status),
            deduplicated: true,
          };
        }
        throw new Error("COMMISSION_ALREADY_PAID");
      }

      await tx.update(commissionEvents).set({
        status: "paid",
        confirmedAmount: event.confirmedAmount ?? String(amount),
        paidAmount: String(amount),
        paidAt: now,
        providerReference: parsed.data.providerReference?.trim() || event.providerReference,
        updatedAt: now,
      }).where(eq(commissionEvents.id, event.id));

      const sourceKey = `commission-paid:${event.id}`;
      await tx.insert(benefitPoolLedger).values({
        entryType: "credit",
        category: "growth_pool",
        amount: String(poolAmount),
        note: parsed.data.note?.trim() || "Automatische 15-%-Gutschrift aus bezahlter Provider-Provision.",
        reference,
        sourceKey,
        createdByEmployeeId: admin.id,
      }).onConflictDoNothing({ target: benefitPoolLedger.sourceKey });

      await appendFinancialLedger(tx, {
        sourceKey: "commission-paid:" + event.id,
        eventType: "commission_paid",
        scope: "provider",
        entityType: "commission_event",
        entityId: event.id,
        orderId: event.orderId,
        employeeId: event.employeeId,
        actorEmployeeId: admin.id,
        amount,
        effect: "increase",
        reference,
        metadata: { previousStatus: event.status, ownerPoolPercent: 15 },
        occurredAt: now,
      });
      await appendFinancialLedger(tx, {
        sourceKey: "growth-pool-credit:" + event.id,
        eventType: "growth_pool_credit",
        scope: "growth_pool",
        entityType: "commission_event",
        entityId: event.id,
        orderId: event.orderId,
        employeeId: event.employeeId,
        actorEmployeeId: admin.id,
        amount: poolAmount,
        effect: "increase",
        reference,
        metadata: { source: "commission_paid", percent: 15 },
        occurredAt: now,
      });

      const reversedForStorno = ["cancelled", "storno"].includes(order.status);
      if (reversedForStorno) {
        const reversalSourceKey = `commission-chargeback:${event.id}`;
        await tx.insert(benefitPoolLedger).values({
          entryType: "spend",
          category: "growth_pool",
          amount: String(poolAmount),
          note: "Automatische Gegenbuchung des 15-%-Pools für einen bereits stornierten Auftrag.",
          reference,
          sourceKey: reversalSourceKey,
          createdByEmployeeId: admin.id,
        }).onConflictDoNothing({ target: benefitPoolLedger.sourceKey });
        await appendFinancialLedger(tx, {
          sourceKey: "growth-pool-chargeback:" + event.id,
          eventType: "growth_pool_chargeback",
          scope: "growth_pool",
          entityType: "commission_event",
          entityId: event.id,
          orderId: event.orderId,
          employeeId: event.employeeId,
          actorEmployeeId: admin.id,
          amount: poolAmount,
          effect: "decrease",
          reference,
          metadata: { orderStatus: order.status, percent: 15 },
          occurredAt: now,
        });
      }

      await writeAudit(tx, admin.id, "commission.marked_paid", "commission_event", event.id, {
        status: event.status,
        paidAmount: previousPaid,
        providerReference: event.providerReference,
      }, {
        status: "paid",
        paidAmount: amount,
        providerReference: parsed.data.providerReference?.trim() || event.providerReference,
        ownerPoolPercent: 15,
        ownerPoolAmount: poolAmount,
        stornoReversalApplied: reversedForStorno,
      });

      return {
        commissionEventId: event.id,
        paidAmount: amount,
        ownerPoolAmount: poolAmount,
        stornoReversalApplied: reversedForStorno,
        deduplicated: false,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "COMMISSION_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Provisionsbuchung oder Auftrag nicht gefunden." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "COMMISSION_ALREADY_PAID") {
      return NextResponse.json({ ok: false, error: "Diese Provision ist bereits final als bezahlt verbucht. Abweichungen müssen als separate Korrektur bzw. Reconciliation dokumentiert werden." }, { status: 409 });
    }
    return adminFailure(error);
  }
}
