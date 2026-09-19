import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { employeeTrainingCompletions, trainingModules } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";
import { trainingMutationSchema } from "@/lib/operations-validation";

export const dynamic = "force-dynamic";

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = trainingMutationSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Schulungsdaten ungültig." }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      if (parsed.data.action === "create") {
        const [created] = await tx.insert(trainingModules).values({
          title: parsed.data.title,
          category: parsed.data.category,
          description: parsed.data.description || "",
          content: parsed.data.content || "",
          productId: parsed.data.productId ?? null,
          required: parsed.data.required,
          validMonths: parsed.data.validMonths ?? null,
          createdByEmployeeId: admin.id,
        }).returning({ id: trainingModules.id });
        await writeAudit(tx, admin.id, "training.created", "training_module", created.id, undefined, { title: parsed.data.title, productId: parsed.data.productId ?? null });
        return created;
      }

      const [module] = await tx.select().from(trainingModules).where(and(eq(trainingModules.id, parsed.data.moduleId), eq(trainingModules.active, true))).limit(1);
      const [employee] = await tx.select({ id: employees.id }).from(employees).where(and(eq(employees.id, parsed.data.employeeId), eq(employees.active, true))).limit(1);
      if (!module || !employee) throw new Error("TRAINING_NOT_FOUND");
      const completedAt = new Date();
      const status = parsed.data.action === "revoke" ? "revoked" : "completed";
      const expiresAt = status === "completed" && module.validMonths ? addMonths(completedAt, module.validMonths) : null;
      const [saved] = await tx.insert(employeeTrainingCompletions).values({
        moduleId: module.id,
        employeeId: employee.id,
        status,
        completedAt,
        expiresAt,
        recordedByEmployeeId: admin.id,
        note: parsed.data.note || "",
      }).onConflictDoUpdate({
        target: [employeeTrainingCompletions.moduleId, employeeTrainingCompletions.employeeId],
        set: { status, completedAt, expiresAt, recordedByEmployeeId: admin.id, note: parsed.data.note || "" },
      }).returning({ id: employeeTrainingCompletions.id });
      await writeAudit(tx, admin.id, `training.${status}`, "employee_training", saved.id, undefined, { moduleId: module.id, employeeId: employee.id, expiresAt });
      return saved;
    });
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TRAINING_NOT_FOUND") return NextResponse.json({ ok: false, error: "Schulung oder Mitarbeiter nicht gefunden." }, { status: 404 });
    return adminFailure(error);
  }
}
