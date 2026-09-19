import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { benefitPoolLedger } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";
import { isCompensationOwner } from "@/lib/compensation";
import { benefitPoolEntrySchema } from "@/lib/product-hub-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    if (!isCompensationOwner(admin)) {
      return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf den Benefit-Pool verwalten." }, { status: 403 });
    }
    const parsed = benefitPoolEntrySchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Buchung ungültig." }, { status: 422 });

    const entry = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [created] = await tx.insert(benefitPoolLedger).values({
        entryType: parsed.data.entryType,
        category: parsed.data.category,
        amount: String(parsed.data.amount),
        note: parsed.data.note,
        reference: parsed.data.reference || null,
        createdByEmployeeId: admin.id,
      }).returning({ id: benefitPoolLedger.id });
      await writeAudit(tx, admin.id, "benefit_pool.entry_created", "benefit_pool", created.id, undefined, {
        entryType: parsed.data.entryType,
        category: parsed.data.category,
        amount: parsed.data.amount,
      });
      return created;
    });

    return NextResponse.json({ ok: true, id: entry.id }, { status: 201 });
  } catch (error) {
    return adminFailure(error);
  }
}
