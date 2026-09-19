import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productCatalogProfiles, products, productUpdates, providerProfiles, providers } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";
import { hubCreateSchema } from "@/lib/product-hub-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = hubCreateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      if (parsed.data.kind === "provider") {
        const [created] = await tx.insert(providers).values({
          name: parsed.data.name,
          category: parsed.data.category,
          externalPartnerId: parsed.data.externalPartnerId || null,
        }).returning();
        await tx.insert(providerProfiles).values({
          providerId: created.id,
          partnerType: parsed.data.partnerType,
          websiteUrl: parsed.data.websiteUrl || null,
          portalUrl: parsed.data.portalUrl || null,
          contactName: parsed.data.contactName || null,
          contactPhone: parsed.data.contactPhone || null,
          contactEmail: parsed.data.contactEmail || null,
          supportContact: parsed.data.supportContact || null,
          billingPath: parsed.data.billingPath || null,
          regions: parsed.data.regions,
          notes: parsed.data.notes || "",
          updatedByEmployeeId: admin.id,
        });
        await writeAudit(tx, admin.id, "provider.created", "provider", created.id, undefined, { name: created.name, category: created.category });
        return { kind: "provider", id: created.id };
      }

      const [provider] = await tx.select({ id: providers.id }).from(providers)
        .where(eq(providers.id, parsed.data.providerId)).limit(1);
      if (!provider) throw new Error("PARTNER_NOT_FOUND");

      const [created] = await tx.insert(products).values({
        providerId: parsed.data.providerId,
        name: parsed.data.name,
        category: parsed.data.category,
        sku: parsed.data.sku || null,
        active: !["ended", "do_not_market"].includes(parsed.data.lifecycleStatus),
      }).returning();

      await tx.insert(productCatalogProfiles).values({
        productId: created.id,
        audience: parsed.data.audience,
        lifecycleStatus: parsed.data.lifecycleStatus,
        description: parsed.data.description || "",
        region: parsed.data.region,
        submissionUrl: parsed.data.submissionUrl || null,
        supportContact: parsed.data.supportContact || null,
        completionProcess: parsed.data.completionProcess || "",
        marketingChannels: parsed.data.marketingChannels,
        marketingConditions: parsed.data.marketingConditions || "",
        salesArguments: parsed.data.salesArguments,
        objections: parsed.data.objections,
        checklist: parsed.data.checklist,
        requiredDocuments: parsed.data.requiredDocuments,
        trainingRequired: parsed.data.trainingRequired,
        highlight: parsed.data.highlight || null,
        updatedByEmployeeId: admin.id,
      });

      await tx.insert(productUpdates).values({
        productId: created.id,
        providerId: created.providerId,
        updateType: "info",
        title: `Neues Produkt: ${created.name}`,
        body: "Das Produkt wurde in den internen TarifWerk-Katalog aufgenommen.",
        important: false,
        createdByEmployeeId: admin.id,
      });

      await writeAudit(tx, admin.id, "product.created", "product", created.id, undefined, {
        name: created.name,
        providerId: created.providerId,
        lifecycleStatus: parsed.data.lifecycleStatus,
      });
      return { kind: "product", id: created.id };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PARTNER_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Partner nicht gefunden." }, { status: 404 });
    }
    return adminFailure(error);
  }
}
