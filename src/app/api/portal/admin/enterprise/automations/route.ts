import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { automationRules } from "@/db/enterprise-schema";
import { authorizeAdmin, adminFailure, readAdminJson } from "@/lib/admin-server";
import { automationCreateSchema } from "@/lib/enterprise-validation";
import { writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = automationCreateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    const rule = await db.transaction(async (tx) => {
      const [created] = await tx.insert(automationRules).values({
        ...parsed.data,
        createdByEmployeeId: admin.id,
      }).returning();
      await writeAudit(tx, admin.id, "automation.created", "automation_rule", created.id, undefined, { name: created.name, eventType: created.eventType });
      return created;
    });
    return NextResponse.json({ ok: true, rule }, { status: 201 });
  } catch (error) {
    return adminFailure(error);
  }
}
