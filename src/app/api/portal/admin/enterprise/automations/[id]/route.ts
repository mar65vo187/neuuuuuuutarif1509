import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { automationRules } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, positiveId, readAdminJson } from "@/lib/admin-server";
import { automationUpdateSchema } from "@/lib/enterprise-validation";
import { writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const id = positiveId((await context.params).id);
    const parsed = automationUpdateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    }

    const rule = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(automationRules).where(eq(automationRules.id, id)).limit(1).for("update");
      if (!existing) return null;
      const [updated] = await tx.update(automationRules)
        .set({ active: parsed.data.active, updatedAt: new Date() })
        .where(eq(automationRules.id, id))
        .returning();
      await writeAudit(tx, admin.id, parsed.data.active ? "automation.activated" : "automation.deactivated", "automation_rule", id, {
        active: existing.active,
      }, {
        active: updated.active,
      });
      return updated;
    });

    if (!rule) return NextResponse.json({ ok: false, error: "Automation nicht gefunden." }, { status: 404 });
    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    return adminFailure(error);
  }
}
