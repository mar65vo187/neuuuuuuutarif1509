import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { benefitPoolLedger, commissionEvents, orders } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { isCompensationOwner } from "@/lib/compensation";
import { writeAudit } from "@/lib/enterprise";
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
    if (!/^\d+$/.test(raw)) return NextResponse.json({ ok: false, error: "Ungültige Provisions-ID." }, { status: 400 });
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

      const [order] = await tx.select({ orderNumber: orders.orderNumber }).from(orders)
        .where(eq(orders.id, event.orderId)).limit(1);

      const amount = roundMoney(parsed.data.amount);
      const poolAmount = roundMoney(amount * 0.15);
      const now = new Date();
      const previousPaid = Number(event.paidAmount ?? 0);

      await tx.update(commissionEvents).set({
        status: "paid",
        confirmedAmount: event.confirmedAmount ?? String(amount),
        paidAmount: String(amount),
        paidAt: now,
        providerReference: parsed.data.providerReference?.trim() || event.providerReference,
        updatedAt: now,
      }).where(eq(commissionEvents.id, event.id));

      const sourceKey = `commission-paid:${event.id}`;
      const reference = parsed.data.providerReference?.trim() || order?.orderNumber || event.providerReference || null;
      await tx.insert(benefitPoolLedger).values({
        entryType: "credit",
        category: "growth_pool",
        amount: String(poolAmount),
        note: parsed.data.note?.trim() || "Automatische 15-%-Gutschrift aus bezahlter Provider-Provision.",
        reference,
        sourceKey,
        createdByEmployeeId: admin.id,
      }).onConflictDoUpdate({
        target: benefitPoolLedger.sourceKey,
        set: {
          entryType: "credit",
          category: "growth_pool",
          amount: String(poolAmount),
          note: parsed.data.note?.trim() || "Automatische 15-%-Gutschrift aus bezahlter Provider-Provision.",
          reference,
          createdByEmployeeId: admin.id,
        },
      });

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
      });

      return { commissionEventId: event.id, paidAmount: amount, ownerPoolAmount: poolAmount };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "COMMISSION_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Provisionsbuchung nicht gefunden." }, { status: 404 });
    }
    return adminFailure(error);
  }
}
