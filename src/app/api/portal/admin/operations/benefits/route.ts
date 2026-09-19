import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { employeeBenefits } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { isCompensationOwner } from "@/lib/compensation";
import { writeAudit } from "@/lib/enterprise";
import { benefitMutationSchema } from "@/lib/operations-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    if (!isCompensationOwner(admin)) return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf Benefits zuweisen." }, { status: 403 });
    const parsed = benefitMutationSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Benefit ungültig." }, { status: 422 });
    const saved = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [row] = await tx.insert(employeeBenefits).values({
        employeeId: parsed.data.employeeId,
        benefitKey: parsed.data.benefitKey,
        label: parsed.data.label,
        status: parsed.data.status,
        details: parsed.data.details || "",
        validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
        validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : null,
        updatedByEmployeeId: admin.id,
      }).onConflictDoUpdate({
        target: [employeeBenefits.employeeId, employeeBenefits.benefitKey],
        set: {
          label: parsed.data.label,
          status: parsed.data.status,
          details: parsed.data.details || "",
          validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
          validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : null,
          updatedByEmployeeId: admin.id,
          updatedAt: new Date(),
        },
      }).returning({ id: employeeBenefits.id });
      await writeAudit(tx, admin.id, "benefit.updated", "employee_benefit", row.id, undefined, { employeeId: parsed.data.employeeId, key: parsed.data.benefitKey, status: parsed.data.status });
      return row;
    });
    return NextResponse.json({ ok: true, id: saved.id }, { status: 201 });
  } catch (error) { return adminFailure(error); }
}
