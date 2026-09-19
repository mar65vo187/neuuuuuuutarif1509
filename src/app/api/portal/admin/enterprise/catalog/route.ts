import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { products, providers } from "@/db/enterprise-schema";
import { authorizeAdmin, adminFailure, readAdminJson } from "@/lib/admin-server";
import { catalogCreateSchema } from "@/lib/enterprise-validation";
import { writeAudit } from "@/lib/enterprise";
import { isCompensationOwner } from "@/lib/compensation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = catalogCreateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    const result = await db.transaction(async (tx) => {
      if (parsed.data.kind === "provider") {
        const [created] = await tx.insert(providers).values({
          name: parsed.data.name,
          category: parsed.data.category,
          externalPartnerId: parsed.data.externalPartnerId || null,
        }).returning();
        await writeAudit(tx, admin.id, "provider.created", "provider", created.id, undefined, { name: created.name, category: created.category });
        return { kind: "provider", item: created };
      }
      const [created] = await tx.insert(products).values({
        providerId: parsed.data.providerId,
        name: parsed.data.name,
        category: parsed.data.category,
        sku: parsed.data.sku || null,
        expectedCommission: isCompensationOwner(admin) && parsed.data.expectedCommission !== undefined
          ? String(parsed.data.expectedCommission).replace(",", ".")
          : null,
      }).returning();
      await writeAudit(tx, admin.id, "product.created", "product", created.id, undefined, { name: created.name, providerId: created.providerId });
      return { kind: "product", item: created };
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return adminFailure(error);
  }
}
