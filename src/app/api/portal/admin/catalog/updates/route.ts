import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { productUpdates } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";
import { productUpdateSchema } from "@/lib/product-hub-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = productUpdateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Update ungültig." }, { status: 422 });
    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [created] = await tx.insert(productUpdates).values({
        productId: parsed.data.productId ?? null,
        providerId: parsed.data.providerId ?? null,
        updateType: parsed.data.updateType,
        title: parsed.data.title,
        body: parsed.data.body || "",
        important: parsed.data.important,
        createdByEmployeeId: admin.id,
      }).returning({ id: productUpdates.id });
      await writeAudit(tx, admin.id, "catalog.update_published", "product_update", created.id, undefined, {
        title: parsed.data.title,
        important: parsed.data.important,
      });
      return created;
    });
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    return adminFailure(error);
  }
}
